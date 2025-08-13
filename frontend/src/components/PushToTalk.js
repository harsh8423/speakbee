"use client";
import React, { useCallback, useRef, useState } from "react";
import { loadVAD, mergeFloat32, downsampleFloat32, encodeWavPCM16, rms } from "../lib/audio";

export default function PushToTalk({ connected, onSend, onWarn }) {
  const [recording, setRecording] = useState(false);
  const ctxRef = useRef(null);
  const srcRef = useRef(null);
  const procRef = useRef(null);
  const streamRef = useRef(null);
  const buffersRef = useRef([]);
  const inputRateRef = useRef(16000);

  const startRecording = useCallback(async () => {
    if (!connected) {
      onWarn?.("[not connected] click Connect first");
      return;
    }
    if (recording) return;
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
  }, [connected, recording, onWarn]);

  const stopRecording = useCallback(async () => {
    if (!recording) return;
    try {
      procRef.current?.disconnect();
      srcRef.current?.disconnect();
      await ctxRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
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
          onWarn?.("[discarded: silence]");
          setRecording(false);
          return;
        }
      }
    } catch {
      const energy = rms(merged);
      if (energy < 0.001) {
        onWarn?.("[discarded: silence]");
        setRecording(false);
        return;
      }
    }
    const ds = downsampleFloat32(trimmed, inputRateRef.current, 16000);
    const wavBuf = encodeWavPCM16(ds, 16000);
    onSend?.(wavBuf);
    setRecording(false);
  }, [recording, onSend, onWarn]);

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", background: '#f7f9fb', padding: 16, borderRadius: 12, border: '1px solid #e5eaf0' }}>
      <button
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onMouseLeave={stopRecording}
        onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
        onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
        style={{ width: 140, height: 140, borderRadius: "50%", border: "none", background: recording ? "#d32f2f" : (connected ? "#1976d2" : '#9e9e9e'), color: "white", fontSize: 18, cursor: connected ? "pointer" : 'not-allowed' }}
        disabled={!connected}
      >
        {recording ? "Release to Send" : "Hold to Talk"}
      </button>
      <div style={{ fontSize: 13, color: "#445" }}>
        <div>Hold the mic button, speak, and release. Client trims silence; backend verifies once</div>
        <div style={{ marginTop: 6 }}>Project: <strong>speakBee</strong></div>
        <div style={{ marginTop: 6, fontSize: 12, color: '#777' }}>Tip: Click Connect first. Your browser will speak the reply using free built‑in TTS.</div>
      </div>
    </div>
  );
}

