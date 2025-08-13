"use client";
import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { processAudio } from "../lib/api";
import { loadVAD, mergeFloat32, downsampleFloat32, encodeWavPCM16, rms } from "../lib/audio";

export default function AudioProcessor({ onResult, onWarn }) {
  const fileRef = useRef(null);
  const [processing, setProcessing] = useState(false);
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
    try {
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
    } catch (err) {
      setError("Failed to access microphone: " + err.message);
    }
  }, [recording]);

  const stopRec = useCallback(async () => {
    if (!recording) return;
    try {
      const proc = procRef.current;
      const src = srcRef.current;
      const ctx = ctxRef.current;
      const stream = streamRef.current;
      
      proc?.disconnect();
      src?.disconnect();
      await ctx?.close();
      stream?.getTracks().forEach((t) => t.stop());
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
    if (!blobToSend) { 
      setError("Record audio or choose a WAV file"); 
      return; 
    }
    
    setProcessing(true);
    try {
      const result = await processAudio(blobToSend);
      onResult?.(result);
      
      // Save result to localStorage
      if (result && result.segments) {
        const savedResults = JSON.parse(localStorage.getItem('speakbee-results') || '[]');
        const newResult = {
          id: Date.now(),
          name: `Analysis - ${new Date().toLocaleDateString()}`,
          date: new Date().toISOString().split('T')[0],
          segments: result.segments
        };
        savedResults.unshift(newResult);
        localStorage.setItem('speakbee-results', JSON.stringify(savedResults.slice(0, 50))); // Keep last 50
      }
      
      if (fileRef.current) fileRef.current.value = "";
      clearRecording();
      onWarn?.(`[processed] ${result.segments?.length || 0} segments found`);
    } catch (err) {
      setError(err?.message || "Failed to process audio");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      


      {/* File Upload */}
      <div>
        <input 
          type="file" 
          accept="audio/wav" 
          ref={fileRef} 
          className="input"
          style={{ fontSize: '13px' }}
        />
      </div>
      
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {!recording ? (
          <button 
            type="button" 
            onClick={startRec} 
            className="btn btn-secondary btn-sm"
            style={{ flex: 1 }}
          >
            🎤 Record
          </button>
        ) : (
          <button 
            type="button" 
            onClick={stopRec} 
            className="btn btn-danger btn-sm"
            style={{ flex: 1 }}
          >
            ⏹️ Stop
          </button>
        )}
        
        <button 
          disabled={processing} 
          type="submit" 
          className={`btn btn-sm ${processing ? 'btn-outline' : 'btn-primary'}`}
          style={{ flex: 1 }}
        >
          {processing ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="shimmer" style={{ width: '10px', height: '10px', borderRadius: '50%' }}></div>
              Processing
            </span>
          ) : (
            '🔍 Analyze'
          )}
        </button>
      </div>

      {/* Audio Preview */}
      {recordedBlob && (
        <div className="card" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          padding: '12px'
        }}>
          <audio 
            controls 
            src={previewUrl} 
            style={{ 
              flex: 1,
              height: '32px'
            }} 
          />
          <button 
            type="button" 
            onClick={clearRecording} 
            className="btn btn-danger btn-sm"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div style={{ 
          padding: '12px',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: 'var(--danger)',
          fontSize: '13px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⚠️ {error}
        </div>
      )}
      
      {/* Instructions */}
      <div style={{ 
        fontSize: '12px', 
        color: 'var(--text-muted)',
        padding: '8px',
        background: 'var(--gray-50)',
        border: '1px solid var(--border-light)',
        borderRadius: '6px',
        textAlign: 'center'
      }}>
        💡 Upload multi-speaker audio for diarization analysis
      </div>
    </form>
  );
}