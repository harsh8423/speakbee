# app.py
import os
import io
import uuid
import pickle
import numpy as np
import torchaudio
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import HTMLResponse
from fastapi import Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
from pathlib import Path
from functools import lru_cache
import torch

# pyannote
from pyannote.audio import Pipeline, Inference



# ASR (whisper)
import whisper
from whisper import load_audio, pad_or_trim, log_mel_spectrogram
from whisper.decoding import DecodingOptions, decode

# similarity
from numpy.linalg import norm

# --- Config ---
ENROLL_FILE = "enrollments.pkl"
MIN_SEGMENT_DURATION = 0.9  # seconds
SIM_THRESHOLD = 0.40  # Lower from 0.70 for testing
TRANSLATE_NON_ENGLISH = True

# Model names (use small models for lower memory)
PYANNOTE_DIA_PIPE = "pyannote/speaker-diarization-3.1"
PYANNOTE_EMBEDDING = "pyannote/embedding"
WHISPER_MODEL_SIZE = "turbo"  # keep turbo for speed
TRANSLATION_MODEL = "small"  # more reliable translation; set None to use turbo

# --- Utilities ---
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
        enrollments = load_enrollments()
        speaker_id = uuid.uuid4().hex[:8]
        enrollments[speaker_id] = {"name": name, "embedding": emb}
        save_enrollments(enrollments)

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

        enrollments = load_enrollments()
        best = (None, None, -1.0)  # id, name, sim
        for sid, meta in enrollments.items():
            sim = cosine_similarity(emb, meta["embedding"])
            if sim > best[2]:
                best = (sid, meta["name"], sim)

        matched = best[2] >= SIM_THRESHOLD
        return {"speaker_id": best[0] if matched else None,
                "name": best[1] if matched else None,
                "similarity": float(best[2]),
                "matched": matched}
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
            best_id, best_name, best_sim = (None, None, -1.0)
            for sid, meta in enrollments.items():
                sim = cosine_similarity(emb, meta["embedding"])
                if sim > best_sim:
                    best_id, best_name, best_sim = sid, meta["name"], sim

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


@app.get("/", response_class=HTMLResponse)
async def home():
    """
    Minimal web UI to test /enroll, /verify, /process endpoints.
    Uses fetch + FormData to POST files and shows JSON results.
    """
    return HTMLResponse(content=html, status_code=200)


# Run
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=False)
