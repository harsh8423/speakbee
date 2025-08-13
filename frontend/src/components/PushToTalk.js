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
    <div style={{ textAlign: 'center' }}>
      {/* Main Voice Button */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
          onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
          style={{
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            border: 'none',
            background: recording
              ? 'linear-gradient(135deg, var(--danger) 0%, var(--danger-dark) 100%)'
              : connected
              ? 'var(--gradient-primary)'
              : 'linear-gradient(135deg, var(--gray-400) 0%, var(--gray-500) 100%)',
            color: 'white',
            fontSize: '16px',
            fontWeight: '700',
            cursor: connected ? 'pointer' : 'not-allowed',
            boxShadow: recording 
              ? '0 0 40px rgba(239, 68, 68, 0.4), var(--shadow-xl)' 
              : connected 
              ? '0 0 30px rgba(0, 0, 0, 0.2), var(--shadow-lg)' 
              : 'var(--shadow-md)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: recording ? 'scale(0.95)' : 'scale(1)',
            position: 'relative',
            overflow: 'hidden'
          }}
          disabled={!connected}
          className={`${recording ? 'glowing' : ''} ${connected ? 'floating' : ''}`}
        >
          {/* Button Shine Effect */}
          <div style={{
            position: 'absolute',
            top: '15%',
            left: '15%',
            right: '15%',
            height: '25%',
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            pointerEvents: 'none',
            opacity: recording ? 0.8 : 0.4
          }}></div>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{ fontSize: '32px' }}>
              {recording ? '🔴' : connected ? '🎤' : '⏸️'}
            </div>
            <div style={{ fontSize: '12px', lineHeight: '1.2', textAlign: 'center', fontWeight: '600' }}>
              {recording ? 'RELEASE TO SEND' : connected ? 'HOLD TO TALK' : 'DISCONNECTED'}
            </div>
          </div>
        </button>
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

