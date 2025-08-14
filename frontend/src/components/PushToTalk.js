"use client";
import React, { useCallback, useRef, useState } from "react";
import { loadVAD, mergeFloat32, downsampleFloat32, encodeWavPCM16, rms } from "../lib/audio";

export default function PushToTalk({ connected, onSend, onWarn }) {
  const [recording, setRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
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
      // Compute instantaneous RMS level for waveform animation
      let sumSquares = 0;
      for (let i = 0; i < ch0.length; i++) {
        const v = ch0[i];
        sumSquares += v * v;
      }
      const rmsLevel = Math.sqrt(sumSquares / ch0.length);
      setAudioLevel((prev) => prev * 0.85 + rmsLevel * 0.15);
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
    setAudioLevel(0);
  }, [recording, onSend, onWarn]);

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Main Voice Button */}
      <div style={{ marginBottom: '24px' }} className="ptt-wrapper">
        <div className="ptt-rings">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
          onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
          className={`ptt-button-core ${recording ? 'recording' : ''}`}
          disabled={!connected}
          style={{ cursor: connected ? 'pointer' : 'not-allowed' }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 10,
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{ fontSize: 28 }}>{recording ? '🔴' : '🎤'}</div>
            <div className="ptt-label">
              {recording ? 'Release to Send' : connected ? 'Hold to Talk' : 'Disconnected'}
            </div>
          </div>
        </button>
      </div>

      {/* Live Waveform */}
      <div className={`waveform free colorful ${recording ? 'recording' : connected ? 'idle' : ''}`} style={{ marginBottom: 16 }}>
        {Array.from({ length: 28 }).map((_, index) => {
          // Shape the bar height based on current audioLevel and index falloff
          const positionFactor = 1 - Math.abs((index - 14) / 14); // center bars taller
          const leveled = Math.min(1, audioLevel * 3);
          const heightPct = 8 + (leveled * 60 + positionFactor * 20);
          // Premium colorful hue across bars
          const totalBars = 28;
          const hueStart = recording ? 350 : 190;
          const hueRange = recording ? 80 : 140;
          const hue = (hueStart + (index / (totalBars - 1)) * hueRange) % 360;
          const saturation = 85;
          const lightness = 55 + Math.min(10, leveled * 10);
          const gradTop = `hsla(${hue}, ${saturation}%, ${Math.min(100, lightness + 5)}%, 1)`;
          const gradBottom = `hsla(${(hue + 10) % 360}, ${saturation}%, ${Math.max(0, lightness - 6)}%, 1)`;
          return (
            <span
              key={index}
              className="wave-bar"
              style={{ 
                height: `${heightPct}%`, 
                animationDelay: `${index * 40}ms`,
                background: `linear-gradient(180deg, ${gradTop}, ${gradBottom})`,
                boxShadow: `0 0 10px hsla(${hue}, ${saturation}%, 60%, ${recording ? 0.45 : 0.3})`
              }}
            />
          );
        })}
      </div>

      {/* Instructions Card */}
      <div className="glass-card" style={{ 
        padding: '20px',
        fontSize: '14px',
        color: 'var(--text-secondary)',
        lineHeight: '1.6',
        maxWidth: '300px',
        margin: '0 auto'
      }}>
        <div style={{ marginBottom: '16px', fontWeight: '700', color: 'var(--text-primary)', fontSize: '16px' }}>
          🎯 Voice Assistant Guide
        </div>
        <div style={{ marginBottom: '8px' }}>• Hold button and speak clearly</div>
        <div style={{ marginBottom: '8px' }}>• Release when finished speaking</div>
        <div style={{ marginBottom: '8px' }}>• AI responds with voice synthesis</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
          💡 Connect first to enable voice interaction
        </div>
      </div>

      {/* Status Indicator */}
      <div style={{ marginTop: '20px' }}>
        <div className={`status-indicator ${connected ? 'status-connected' : 'status-disconnected'}`}>
          <div className="pulse-dot"></div>
          {connected ? 'Ready to Record' : 'Connect First'}
        </div>
      </div>
    </div>
  );
}

