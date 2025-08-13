"use client";
import React, { useCallback, useRef, useState } from "react";
import { enrollSpeaker } from "../lib/api";
import { loadVAD, mergeFloat32, downsampleFloat32, encodeWavPCM16, rms } from "../lib/audio";

export default function EnrollForm({ onEnrolled }) {
  const fileRef = useRef(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const ctxRef = useRef(null);
  const srcRef = useRef(null);
  const procRef = useRef(null);
  const streamRef = useRef(null);
  const buffersRef = useRef([]);
  const inputRateRef = useRef(16000);

  const startRec = useCallback(async () => {
    if (recording) return;
    setError("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
    streamRef.current = stream;
    const ctx = new AudioContext({ sampleRate: 48000 });
    inputRateRef.current = ctx.sampleRate;
    const src = ctx.createMediaStreamSource(stream);
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    src.connect(proc);
    proc.connect(ctx.destination);
    buffersRef.current = [];
    proc.onaudioprocess = (ev) => {
      const ch0 = ev.inputBuffer.getChannelData(0);
      buffersRef.current.push(new Float32Array(ch0));
    };
    ctxRef.current = ctx; srcRef.current = src; procRef.current = proc;
    setRecording(true);
  }, [recording]);

  const stopRec = useCallback(async () => {
    if (!recording) return;
    try {
      procRef.current?.disconnect();
      srcRef.current?.disconnect();
      await ctxRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    setRecording(false);

    const merged = mergeFloat32(buffersRef.current);
    buffersRef.current = [];

    let trimmed = merged;
    try {
      const mod = await loadVAD();
      if (mod && mod.trimBuffer) {
        trimmed = await mod.trimBuffer(merged, inputRateRef.current, { aggressiveness: 2 });
      } else {
        const energy = rms(merged);
        if (energy < 0.001) {
          setError("Silence detected. Please record again.");
          return;
        }
      }
    } catch {
      const energy = rms(merged);
      if (energy < 0.001) {
        setError("Silence detected. Please record again.");
        return;
      }
    }

    const ds = downsampleFloat32(trimmed, inputRateRef.current, 16000);
    const wavBuf = encodeWavPCM16(ds, 16000);
    const blob = new Blob([wavBuf], { type: 'audio/wav' });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  }, [recording, previewUrl]);

  const clearRecording = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(null);
    setPreviewUrl("");
  }, [previewUrl]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const blobToSend = recordedBlob || fileRef.current?.files?.[0];
    if (!blobToSend) { setError("Record or choose a WAV file"); return; }
    if (!name.trim()) { setError("Enter a name"); return; }
    setBusy(true);
    try {
      const res = await enrollSpeaker(blobToSend, name.trim());
      onEnrolled?.(res);
      setName("");
      if (fileRef.current) fileRef.current.value = "";
      clearRecording();
    } catch (err) {
      setError(err?.message || "Failed to enroll");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ border: '1px solid #e5eaf0', borderRadius: 12, padding: 16, background: '#fcfdff' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Enroll a Speaker</div>
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" accept="audio/wav" ref={fileRef} style={{ flex: '1 1 auto' }} />
          <input placeholder="Speaker name" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: '1 1 200px', padding: 8, borderRadius: 8, border: '1px solid #ccd6e0' }} />
          <button disabled={busy} type="submit" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #1976d2', background: '#1976d2', color: '#fff', cursor: 'pointer' }}>
            {busy ? 'Enrolling…' : 'Enroll'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {!recording ? (
            <button type="button" onClick={startRec} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2e7d32', background: '#2e7d32', color: '#fff', cursor: 'pointer' }}>Start Recording</button>
          ) : (
            <button type="button" onClick={stopRec} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #c62828', background: '#c62828', color: '#fff', cursor: 'pointer' }}>Stop Recording</button>
          )}
          {recordedBlob && (
            <>
              <audio controls src={previewUrl} style={{ height: 32 }} />
              <button type="button" onClick={clearRecording} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #757575', background: '#757575', color: '#fff', cursor: 'pointer' }}>Clear</button>
            </>
          )}
        </div>
      </div>
      {error && <div style={{ marginTop: 8, color: '#c62828' }}>{error}</div>}
      <div style={{ marginTop: 8, fontSize: 12, color: '#777' }}>Hint: Upload a short mono WAV (1–3s) of the speaker’s clear voice.</div>
    </form>
  );
}

