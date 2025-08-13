# app.py
import os
import io
import uuid
import pickle
import numpy as np
import torchaudio
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import HTMLResponse
from fastapi import Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
from pathlib import Path
from functools import lru_cache
import torch
import torch
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv
import json
import base64
from groq import Groq

# Load environment variables from .env file
load_dotenv()
from pyannote.audio import Pipeline, Inference

from huggingface_hub import login
login(os.getenv("HF_TOKEN"))

# ASR (whisper)
import whisper
from whisper import load_audio, pad_or_trim, log_mel_spectrogram
from whisper.decoding import DecodingOptions, decode

# similarity
from numpy.linalg import norm

ENROLL_FILE = "enrollments.pkl"
MIN_SEGMENT_DURATION = 0.9  # seconds
SIM_THRESHOLD = 0.60  # Lower from 0.70 for testing
TRANSLATE_NON_ENGLISH = True

# MongoDB config
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "speakbee")
MONGODB_COLL = os.getenv("MONGODB_COLL", "enrollments")
VECTOR_INDEX_NAME = os.getenv("VECTOR_INDEX_NAME", "enrollments_vector_index")

# Model names (use small models for lower memory)
PYANNOTE_DIA_PIPE = "pyannote/speaker-diarization-3.1"
PYANNOTE_EMBEDDING = "pyannote/embedding"
WHISPER_MODEL_SIZE = "turbo"  # keep turbo for speed
TRANSLATION_MODEL = "small"  # more reliable translation; set None to use turbo

# --- Utilities ---

def get_mongo_coll():
    client = MongoClient(MONGODB_URI)
    coll = client[MONGODB_DB][MONGODB_COLL]
    # Ensure unique speaker_id index (idempotent)
    coll.create_index("speaker_id", unique=True)
    return coll

def mongo_upsert_enrollment(speaker_id: str, name: str, emb: np.ndarray):
    coll = get_mongo_coll()
    now = datetime.utcnow()
    coll.update_one(
        {"speaker_id": speaker_id},
        {
            "$set": {
                "speaker_id": speaker_id,
                "name": name,
                "embedding": emb.astype(np.float32).tolist(),
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

def mongo_get_enrollment(speaker_id: str):
    coll = get_mongo_coll()
    return coll.find_one({"speaker_id": speaker_id}, {"_id": 0, "embedding": 0})

def mongo_delete_enrollment(speaker_id: str):
    coll = get_mongo_coll()
    coll.delete_one({"speaker_id": speaker_id})

def mongo_list_enrollments(limit: int = 500):
    coll = get_mongo_coll()
    return list(coll.find({}, {"_id": 0, "embedding": 0}).limit(limit))

def mongo_vector_search(emb: np.ndarray, k: int = 1):
    coll = get_mongo_coll()
    vec = emb.astype(np.float32).tolist()
    pipeline = [
        {
            "$vectorSearch": {
                "index": VECTOR_INDEX_NAME,
                "path": "embedding",
                "queryVector": vec,
                "numCandidates": max(50, k * 10),
                "limit": k,
            }
        },
        {
            "$project": {
                "_id": 0,
                "speaker_id": 1,
                "name": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]
    return list(coll.aggregate(pipeline))



def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a = a.astype(np.float32)
    b = b.astype(np.float32)
    if a.ndim == 1 and b.ndim == 1:
        denom = (norm(a) * norm(b) + 1e-8)
        return float(np.dot(a, b) / denom)
    else:
        raise ValueError("Expected 1D arrays")

def save_enrollments(d):
    with open(ENROLL_FILE, "wb") as f:
        pickle.dump(d, f)

def load_enrollments():
    if not os.path.exists(ENROLL_FILE):
        return {}
    with open(ENROLL_FILE, "rb") as f:
        d = pickle.load(f)
    return d

# --- Load models once (on startup) ---
@lru_cache()
def get_models():
    pipeline = Pipeline.from_pretrained(PYANNOTE_DIA_PIPE)
    embedder = Inference(PYANNOTE_EMBEDDING, window="whole")
    asr_model = whisper.load_model(WHISPER_MODEL_SIZE, device="cpu")
    translator = whisper.load_model(TRANSLATION_MODEL, device="cpu") if TRANSLATION_MODEL else None
    return {"pipeline": pipeline, "embedder": embedder, "asr": asr_model, "translator": translator}

models = get_models()

app = FastAPI(title="Speaker ID + Diarization + ASR Backend")

# Allow browser origins and any hosts (dev-friendly). For production, restrict these.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# --- Request/Response Models ---
class EnrollResponse(BaseModel):
    speaker_id: str
    name: str
    message: str

class VerifyResponse(BaseModel):
    speaker_id: Optional[str]
    name: Optional[str]
    similarity: Optional[float]
    matched: bool

class SegmentOut(BaseModel):
    start: float
    end: float
    diar_label: str
    speaker_id: Optional[str]
    speaker_name: Optional[str]
    similarity: Optional[float]
    text: str
    language: Optional[str]
    text_original: Optional[str] = None
    text_translated: Optional[str] = None

class ProcessOutput(BaseModel):
    file: str
    segments: List[SegmentOut]

# --- Endpoints ---

@app.post("/enroll", response_model=EnrollResponse)
async def enroll(audio: UploadFile = File(...), name: str = Form(...)):
    """
    Upload WAV (mono) file containing single speaker utterance for enrollment.
    Returns generated speaker_id and saves embedding.
    """
    if audio.content_type not in ("audio/wav", "audio/x-wav", "audio/wave"):
        raise HTTPException(415, "Only WAV files accepted (mono recommended).")
    data = await audio.read()
    # save temp file
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(data)
        tmp_path = f.name

    try:
        waveform, sr = torchaudio.load(tmp_path)
        # embed whole file (pyannote's Inference expects dict)
        emb = models["embedder"]({"waveform": waveform, "sample_rate": sr})
        emb = np.asarray(emb, dtype=np.float32).squeeze()

        # store
        # enrollments = load_enrollments()
        # speaker_id = uuid.uuid4().hex[:8]
        # enrollments[speaker_id] = {"name": name, "embedding": emb}
        # save_enrollments(enrollments)
        
        # store (MongoDB)
        enrollments = {}  # unused now; retained for compatibility
        speaker_id = uuid.uuid4().hex[:8]
        mongo_upsert_enrollment(speaker_id, name, emb)

        return {"speaker_id": speaker_id, "name": name, "message": "enrolled"}
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.post("/verify", response_model=VerifyResponse)
async def verify(audio: UploadFile = File(...)):
    """
    Verify single speaker audio against enrolled set.
    """
    if audio.content_type not in ("audio/wav", "audio/x-wav", "audio/wave"):
        raise HTTPException(415, "Only WAV files accepted.")
    data = await audio.read()
    
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(data)
        tmp_path = f.name

    try:
        waveform, sr = torchaudio.load(tmp_path)
        emb = models["embedder"]({"waveform": waveform, "sample_rate": sr})
        emb = np.asarray(emb, dtype=np.float32).squeeze()

        # Vector search in MongoDB for top-1
        topk = mongo_vector_search(emb, k=1)
        if topk:
            top = topk[0]
            sim = float(top.get("score", 0.0))
            matched = sim >= SIM_THRESHOLD
            return {
                "speaker_id": top["speaker_id"] if matched else None,
                "name": top["name"] if matched else None,
                "similarity": sim,
                "matched": matched,
            }
        else:
            return {"speaker_id": None, "name": None, "similarity": None, "matched": False}

    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.post("/process", response_model=ProcessOutput)
async def process_audio(audio: UploadFile = File(...)):
    """
    Full pipeline:
     - diarization (pyannote)
     - for each sizable diarized speaker: embedding -> identify
     - ASR for each segment -> language detection + optional translation
    """
    # accept wav
    if audio.content_type not in ("audio/wav", "audio/x-wav", "audio/wave"):
        raise HTTPException(415, "Only WAV files accepted.")

    data = await audio.read()
    file_id = uuid.uuid4().hex
    
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(data)
        tmp_path = f.name

    try:
        # run diarization (pyannote pipeline expects path or mapping)
        diarization = models["pipeline"](tmp_path)

        # load full wave for slicing
        waveform, sr = torchaudio.load(tmp_path)
        enrollments = load_enrollments()

        segments_out = []

        for segment, _, diar_label in diarization.itertracks(yield_label=True):
            duration = segment.end - segment.start
            if duration < MIN_SEGMENT_DURATION:
                # Option: skip small segments (or merge). we'll skip here.
                continue

            s_frame = int(segment.start * sr)
            e_frame = int(segment.end * sr)
            seg_wave = waveform[:, s_frame:e_frame]

            # embedding
            emb = models["embedder"]({"waveform": seg_wave, "sample_rate": sr})
            emb = np.asarray(emb, dtype=np.float32).squeeze()

            # identify vs enrolled
            # identify vs enrolled (MongoDB vector search)
            best_id, best_name, best_sim = (None, None, -1.0)
            topk = mongo_vector_search(emb, k=1)
            if topk:
                top = topk[0]
                best_id, best_name, best_sim = top.get("speaker_id"), top.get("name"), float(top.get("score", 0.0))

            # ASR
            seg = seg_wave
            if seg.dtype != torch.float32:
                seg = seg.float()
            if seg.dim() == 2 and seg.size(0) > 1:
                seg = seg.mean(dim=0, keepdim=True)  # (1, T)
            elif seg.dim() == 1:
                seg = seg.unsqueeze(0)  # (1, T)

            if seg.size(-1) < int(0.2 * sr):
                text = ""
                detected_language = None
                text_original = None
                text_translated = None
            else:
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
                    temp_audio_path = temp_audio.name
                try:
                    torchaudio.save(temp_audio_path, seg.cpu(), sr)

                    # First pass: original transcription + language detection
                    first = models["asr"].transcribe(
                        temp_audio_path,
                        fp16=False,
                        condition_on_previous_text=False
                    )
                    detected_language = first.get("language", None)
                    text_original = first.get("text", "").strip()

                    # Optional second pass: translate to English if not English
                    text_translated = None
                    if TRANSLATE_NON_ENGLISH and detected_language and detected_language != "en":
                        model_for_translate = models["translator"] or models["asr"]
                        second = model_for_translate.transcribe(
                            temp_audio_path,
                            fp16=False,
                            task="translate",
                            language=None,                   # let the model handle language and force English
                            condition_on_previous_text=False,
                            temperature=0.0,
                            beam_size=5
                        )
                        text_translated = second.get("text", "").strip()

                    # text field for display: English if translated, else original
                    text = text_translated if text_translated else text_original
                finally:
                    if os.path.exists(temp_audio_path):
                        os.remove(temp_audio_path)

            # ...
            segments_out.append(SegmentOut(
                start=float(segment.start),
                end=float(segment.end),
                diar_label=diar_label,
                speaker_id=best_id if best_sim >= SIM_THRESHOLD else None,
                speaker_name=best_name if best_sim >= SIM_THRESHOLD else None,
                similarity=float(best_sim) if best_sim >= 0 else None,
                text=text,
                language=detected_language,
                text_original=(text_original if detected_language and detected_language != "en" else None),
                text_translated=text_translated
            ))

        return ProcessOutput(file=file_id, segments=segments_out)
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

#############################################
# Realtime push-to-talk assistant (WebSocket)
#############################################

    # Config for conversational assistant
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_CHAT_MODEL = os.getenv("GROQ_CHAT_MODEL", "llama-3.1-8b-instant")
GROQ_STT_MODEL = os.getenv("GROQ_STT_MODEL", "whisper-large-v3")
SAMPLE_RATE = 16000

# Groq client (one provider for both LLM and STT)
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

def _wav_bytes_to_tensor(wav_bytes: bytes) -> torch.Tensor:
    """Decode WAV bytes to mono float32 tensor at SAMPLE_RATE."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(wav_bytes)
        tmp = f.name
    try:
        waveform, sr = torchaudio.load(tmp)
    finally:
        try:
            os.remove(tmp)
        except Exception:
            pass
    if sr != SAMPLE_RATE:
        waveform = torchaudio.functional.resample(waveform, sr, SAMPLE_RATE)
    if waveform.dim() == 2 and waveform.size(0) > 1:
        waveform = waveform.mean(dim=0, keepdim=True)
    elif waveform.dim() == 1:
        waveform = waveform.unsqueeze(0)
    if waveform.dtype != torch.float32:
        waveform = waveform.float()
    return waveform

def _rms_energy(audio: torch.Tensor) -> float:
    return float(torch.sqrt(torch.mean(audio.pow(2))).item())

def _is_speech(audio: torch.Tensor, threshold: float = 0.005) -> bool:
    return _rms_energy(audio) > threshold

async def _generate_ai_response_grok(messages: List[Dict[str, str]]) -> str:
    if not XAI_API_KEY:
        return "I am not configured to respond yet."
    url = "https://api.x.ai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {XAI_API_KEY}", "Content-Type": "application/json"}
    payload = {"model": GROK_MODEL, "messages": messages, "temperature": 0.6}
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"]

async def _tts_openai_wav(text: str) -> bytes:
    if not OPENAI_API_KEY:
        return b""
    url = "https://api.openai.com/v1/audio/speech"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
    payload = {"model": "tts-1", "voice": TTS_VOICE, "input": text, "format": "wav"}
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, headers=headers, json=payload)
        r.raise_for_status()
        return r.content

class _SessionState(BaseModel):
    session_id: str
    known_speaker: bool = False
    speaker_id: Optional[str] = None
    speaker_name: Optional[str] = None
    waiting_enroll_confirmation: bool = False
    convo: List[Dict[str, str]] = []
    greeted_known: bool = False

_sessions: Dict[str, _SessionState] = {}

@app.websocket("/ws/stream")
async def ws_stream(ws: WebSocket):
    await ws.accept()
    sess_id = uuid.uuid4().hex
    state = _SessionState(session_id=sess_id)
    _sessions[sess_id] = state

    # initial greeting for push-to-talk
    greeting = "Hold the mic button, speak, then release to send."
    await ws.send_json({"type": "event", "event": "hello", "text": greeting})
    try:
        while True:
            msg = await ws.receive()

            # Control JSON
            if msg.get("text") is not None:
                try:
                    data = json.loads(msg["text"]) if msg["text"] else {}
                except Exception:
                    data = {}
                if data.get("type") == "stop":
                    break
                if data.get("type") == "enroll_name":
                    if state.waiting_enroll_confirmation and not state.known_speaker:
                        name = data.get("name", "Guest")
                        # Use last voiced embedding approach: ask client to resend a clear 2s chunk after giving name
                        # Here we simply mark as enrolled without embedding capture.
                        # Production: capture next voiced chunk, compute embedding, upsert in Mongo.
                        # Create a short random id for placeholder; real flow should supply embedding.
                        speaker_id = uuid.uuid4().hex[:8]
                        # Attempt to store if client optionally sent embedding
                        emb_arr = data.get("embedding")
                        if emb_arr is not None:
                            try:
                                emb_np = np.array(emb_arr, dtype=np.float32)
                                mongo_upsert_enrollment(speaker_id, name, emb_np)
                            except Exception:
                                pass
                        state.known_speaker = True
                        state.speaker_id = speaker_id
                        state.speaker_name = name
                        state.waiting_enroll_confirmation = False
                        confirm = f"Thanks, {name}. You are enrolled."
                        waw = await _tts_openai_wav(confirm)
                        await ws.send_json({"type": "event", "event": "enrolled", "speaker_id": speaker_id, "name": name})
                        if waw:
                            await ws.send_json({"type": "audio", "format": "wav", "data": base64.b64encode(waw).decode("utf-8")})
                continue

            # Binary WAV utterance (sent after user releases mic button)
            if msg.get("bytes") is not None:
                utterance = msg["bytes"]
                audio = _wav_bytes_to_tensor(utterance)  # (1, T)

                # Client is responsible for VAD trimming; minimal energy gate here
                if not _is_speech(audio):
                    await ws.send_json({"type": "event", "event": "no_voice"})
                    continue

                # Identify speaker once at the beginning of the session
                if not state.known_speaker:
                    emb = models["embedder"]({"waveform": audio, "sample_rate": SAMPLE_RATE})
                    emb = np.asarray(emb, dtype=np.float32).squeeze()
                    try:
                        hits = mongo_vector_search(emb, k=1)
                    except Exception:
                        hits = []
                    if hits:
                        top = hits[0]
                        score = float(top.get("score", 0.0))
                        if score >= SIM_THRESHOLD:
                            state.known_speaker = True
                            state.speaker_id = top.get("speaker_id")
                            state.speaker_name = top.get("name")
                            await ws.send_json({
                                "type": "event",
                                "event": "known_speaker",
                                "speaker_id": state.speaker_id,
                                "name": state.speaker_name,
                                "score": score,
                            })
                        else:
                            state.waiting_enroll_confirmation = True
                            await ws.send_json({
                                "type": "event",
                                "event": "ask_enroll",
                                "text": "Please enroll first to save your conversations for the future.",
                            })
                    else:
                        state.waiting_enroll_confirmation = True
                        await ws.send_json({
                            "type": "event",
                            "event": "ask_enroll",
                            "text": "Please enroll first to save your conversations for the future.",
                        })

                # Transcribe full utterance (Groq Whisper)
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
                    # Save WAV using default encoding compatible with Groq STT
                    torchaudio.save(
                        tf.name,
                        audio.cpu(),
                        SAMPLE_RATE,
                    )
                    tmp_path = tf.name
                try:
                    if not groq_client:
                        user_text = ""
                    else:
                        # Prefer passing a file handle; request plain text output for reliability
                        with open(tmp_path, "rb") as fh:
                            trans = groq_client.audio.transcriptions.create(
                                model=GROQ_STT_MODEL,
                                file=("audio.wav", fh, "audio/wav"),
                                response_format="text",
                                language="en",
                            )
                        # response_format="text" may return a string; fallback to attribute
                        if isinstance(trans, str):
                            user_text = trans.strip()
                        else:
                            user_text = (getattr(trans, "text", None) or "").strip()
                finally:
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass
                if not user_text:
                    await ws.send_json({"type": "event", "event": "empty_transcript"})
                    continue

                await ws.send_json({
                    "type": "transcript",
                    "text": user_text,
                    "speaker_name": state.speaker_name if state.known_speaker else None,
                })

                # Handle yes/no for enrollment based on natural language
                if state.waiting_enroll_confirmation and not state.known_speaker:
                    lower = user_text.lower()
                    if any(k in lower for k in ["yes", "yeah", "yep", "ok", "sure"]):
                        await ws.send_json({"type": "event", "event": "ask_name"})
                        continue
                    if any(k in lower for k in ["no", "not now", "later"]):
                        state.waiting_enroll_confirmation = False
                        # no audio from backend; client will TTS
                        continue

                # Conversation via Groq with greeting logic
                system = "You are a helpful assistant for a hackathon team. Be concise and friendly."
                if state.speaker_name:
                    system += f" The user's name is {state.speaker_name}."
                messages = [{"role": "system", "content": system}]
                for m in state.convo[-10:]:
                    messages.append(m)
                messages.append({"role": "user", "content": user_text})
                # Build greeting/preamble
                greeting_prefix = ""
                if state.known_speaker and not state.greeted_known and state.speaker_name:
                    greeting_prefix = f"Hi {state.speaker_name}! I can recognize you. "
                    state.greeted_known = True
                elif not state.known_speaker:
                    greeting_prefix = (
                        "I don't recognize you yet. If you'd like me to save this and future conversations, please enroll your voice in the Enroll panel. "
                    )
                full_reply = greeting_prefix
                if greeting_prefix:
                    try:
                        await ws.send_json({"type": "ai_delta", "text": greeting_prefix})
                    except Exception:
                        pass
                if groq_client:
                    try:
                        stream = groq_client.chat.completions.create(
                            model=GROQ_CHAT_MODEL,
                            messages=messages,
                            temperature=0.6,
                            stream=True,
                        )
                        for chunk in stream:
                            delta = chunk.choices[0].delta.content if chunk.choices and chunk.choices[0].delta else None
                            if delta:
                                full_reply += delta
                                await ws.send_json({"type": "ai_delta", "text": delta})
                    except Exception:
                        pass
                # Fallback: if no streaming happened, request non-stream
                if not full_reply and groq_client:
                    try:
                        comp = groq_client.chat.completions.create(
                            model=GROQ_CHAT_MODEL,
                            messages=messages,
                            temperature=0.6,
                        )
                        full_reply = comp.choices[0].message.content or ""
                    except Exception:
                        full_reply = ""
                state.convo.extend([
                    {"role": "user", "content": user_text},
                    {"role": "assistant", "content": full_reply},
                ])
                await ws.send_json({"type": "ai_done", "text": full_reply})

    except WebSocketDisconnect:
        pass
    finally:
        _sessions.pop(sess_id, None)
        try:
            await ws.close()
        except Exception:
            pass

@app.get("/enrollments")
async def list_enrollments():
    docs = mongo_list_enrollments()
    return {"count": len(docs), "items": docs}


@app.delete("/enrollments/{speaker_id}")
async def delete_enrollment(speaker_id: str):
    before = mongo_get_enrollment(speaker_id)
    if not before:
        raise HTTPException(404, "Not found")
    mongo_delete_enrollment(speaker_id)
    return {"speaker_id": speaker_id, "message": "deleted"}


@app.get("/", response_class=HTMLResponse)
async def home():
    """
    Minimal web UI to test /enroll, /verify, /process endpoints.
    Uses fetch + FormData to POST files and shows JSON results.
    """
    return HTMLResponse(content=html, status_code=200)


# Run
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
