"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WS_URL } from "../lib/api";
import PushToTalk from "../components/PushToTalk";
import EnrollForm from "../components/EnrollForm";
import EnrollmentList from "../components/EnrollmentList";

// Audio helpers moved to components/lib

export default function Page() {
  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [logs, setLogs] = useState([]);
  const [partial, setPartial] = useState("");
  const [speaker, setSpeaker] = useState(null);

  const wsRef = useRef(null);
  const ctxRef = useRef(null);
  const srcRef = useRef(null);
  const procRef = useRef(null);
  const streamRef = useRef(null);
  const buffersRef = useRef([]);
  const inputRateRef = useRef(16000);

  const wsUrl = useMemo(() => {
    return WS_URL || `ws://${location.hostname}:8000/ws/stream`;
  }, []);

  const connectWs = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setSpeaker(null);
    };
    ws.onerror = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "event") {
          setLogs((l) => [`[${msg.event}] ${msg.text || ""}`, ...l]);
          if (msg.event === "known_speaker") {
            // event also comes as its own object below; keep both paths safe
          }
        } else if (msg.type === "transcript") {
          setLogs((l) => [`User: ${msg.text}`, ...l]);
        } else if (msg.type === "ai_delta") {
          setPartial((p) => p + msg.text);
        } else if (msg.type === "ai_done") {
          const text = msg.text || partial;
          setPartial("");
          if (text) {
            setLogs((l) => [`Assistant: ${text}`, ...l]);
            if ("speechSynthesis" in window) {
              const utter = new SpeechSynthesisUtterance(text);
              speechSynthesis.speak(utter);
            }
          }
        } else if (msg.type === "event" && msg.event === "known_speaker") {
          // Some servers send as event; ours also sends a dedicated object; handle both.
        } else if (msg.event === "known_speaker" || msg.type === "known_speaker") {
          const name = msg.name || null;
          const score = typeof msg.score === "number" ? msg.score.toFixed(3) : undefined;
          setSpeaker(name ? `${name}${score ? ` (${score})` : ""}` : null);
        }
      } catch {
        // ignore binary
      }
    };
    wsRef.current = ws;
  }, [wsUrl, partial]);

  const disconnectWs = useCallback(() => {
    try {
      wsRef.current?.close();
    } catch {}
    setConnected(false);
    setSpeaker(null);
  }, []);

  const onSendAudio = useCallback((wavBuf) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(wavBuf);
      setLogs((l) => ["[sent utterance]", ...l]);
    } else {
      setLogs((l) => ["[ws not connected]", ...l]);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!connected) {
      setLogs((l) => ["[not connected] click Connect first", ...l]);
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

    ctxRef.current = ctx;
    srcRef.current = src;
    procRef.current = proc;
    setRecording(true);
  }, [connected, recording]);

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

    // Optional: client-side VAD trim (WASM). If not available, fall back to RMS gating.
    let trimmed = merged;
    try {
      const mod = await loadVAD();
      if (mod && mod.trimBuffer) {
        // Example API if your chosen VAD lib exposes a trim function.
        // Adjust based on the actual library you install.
        trimmed = await mod.trimBuffer(merged, inputRateRef.current, { aggressiveness: 2 });
      } else {
        // Simple energy gate fallback
        const energy = rms(merged);
        if (energy < 0.001) {
          setLogs((l) => ["[discarded: silence]", ...l]);
          setRecording(false);
          return;
        }
      }
    } catch {
      const energy = rms(merged);
      if (energy < 0.001) {
        setLogs((l) => ["[discarded: silence]", ...l]);
        setRecording(false);
        return;
      }
    }

    const ds = downsampleFloat32(trimmed, inputRateRef.current, 16000);
    const wavBuf = encodeWavPCM16(ds, 16000);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(wavBuf);
      setLogs((l) => ["[sent utterance]", ...l]);
    } else {
      setLogs((l) => ["[ws not connected]", ...l]);
    }
    setRecording(false);
  }, [recording]);

  useEffect(() => {
    return () => {
      try {
        procRef.current?.disconnect();
        srcRef.current?.disconnect();
        ctxRef.current?.close();
        streamRef.current?.getTracks().forEach((t) => t.stop());
        wsRef.current?.close();
      } catch {}
    };
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "32px auto", padding: 16, fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ffd54f', display: 'grid', placeItems: 'center', fontWeight: 800, color: '#222' }}>🐝</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>speakBee</div>
            <div style={{ fontSize: 12, color: '#666' }}>Push‑to‑Talk Voice Assistant</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666' }}>
            <span style={{ width: 10, height: 10, borderRadius: 6, background: connected ? '#43a047' : '#e53935', display: 'inline-block' }}></span>
            {connected ? 'Connected' : 'Disconnected'} {speaker ? `· ${speaker}` : ''}
          </span>
          {!connected ? (
            <button onClick={connectWs} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #1976d2', background: '#1976d2', color: '#fff', cursor: 'pointer' }}>Connect</button>
          ) : (
            <button onClick={disconnectWs} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #b71c1c', background: '#b71c1c', color: '#fff', cursor: 'pointer' }}>Disconnect</button>
          )}
        </div>
      </header>

      <PushToTalk connected={connected} onSend={onSendAudio} onWarn={(m) => setLogs((l) => [m, ...l])} />

      {!!partial && (
        <div style={{ marginTop: 16, padding: 10, background: "#eef", borderRadius: 8, border: '1px solid #cfd8dc' }}>
          <strong>Assistant (streaming):</strong> {partial}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div>
          <h4 style={{ margin: 0, marginBottom: 8 }}>Conversation</h4>
          <div style={{ height: 320, overflowY: "auto", border: "1px solid #e0e0e0", borderRadius: 10, padding: 12, background: "#fafafa" }}>
            {logs.map((l, i) => (
              <div key={i} style={{ marginBottom: 6 }}>{l}</div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <EnrollForm onEnrolled={(res) => setLogs((l) => [`[enrolled] ${res.name} (${res.speaker_id})`, ...l])} />
          <EnrollmentList />
        </div>
      </div>
    </div>
  );
}