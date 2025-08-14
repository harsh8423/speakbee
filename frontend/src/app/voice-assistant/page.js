"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WS_URL } from "../../lib/api";
import Layout from "../../components/Layout";
import Image from "next/image";
import PushToTalk from "../../components/PushToTalk";

export default function VoiceAssistant() {
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const [partial, setPartial] = useState("");
  const [speaker, setSpeaker] = useState(null);

  const wsRef = useRef(null);

  const wsUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return WS_URL || `ws://${window.location.hostname}:8000/ws/stream`;
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
      const ws = wsRef.current;
      ws?.close();
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

  useEffect(() => {
    return () => {
      try {
        const ws = wsRef.current;
        ws?.close();
      } catch {}
    };
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">
          🎤 Voice Assistant
        </h1>
        <p className="page-subtitle">
          Interactive AI voice conversation with real-time speech recognition
        </p>
      </div>

      <div className="page-content two-col" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
        {/* Voice Controls */}
        <div className="content-section">
          <div className="card-header">
            <h2 className="card-title">
              <Image src="/mic.svg" alt="" width={18} height={18} />
              Voice Controls
            </h2>
          </div>
          
          {/* Connection Status */}
          <div style={{ paddingTop: 12, marginBottom: 16 }}>
            <div className={`status-indicator ${connected ? 'status-connected' : 'status-disconnected'}`}>
              <div className="pulse-dot"></div>
              {connected ? 'Connected' : 'Disconnected'}
              {speaker && <span>• {speaker}</span>}
            </div>
            
            <div style={{ marginTop: 12 }} className="btn-group">
              {!connected ? (
                <button onClick={connectWs} className="btn btn-success btn-md">Connect</button>
              ) : (
                <button onClick={disconnectWs} className="btn btn-danger btn-md">Disconnect</button>
              )}
            </div>
          </div>

          {/* Push to Talk + Centered Waveform */}
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <PushToTalk 
              connected={connected} 
              onSend={onSendAudio} 
              onWarn={(m) => setLogs((l) => [m, ...l])} 
            />
          </div>

          {/* Toolbar (removed per request) */}
        </div>

        {/* Conversation */}
        <div className="content-section" style={{ minHeight: 600, display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h2 className="card-title">
              <Image src="/assistant.svg" alt="" width={18} height={18} />
              Live Conversation
            </h2>
          </div>

          {/* Streaming Response */}
          {partial && (
            <div className="card" style={{ border: '2px solid var(--info)', background: 'rgba(59,130,246,0.02)', margin: 16 }}>
              <div className="card-header" style={{ borderBottomColor: 'rgba(59,130,246,0.15)', background: 'rgba(59,130,246,0.02)' }}>
                <h3 className="card-title" style={{ color: 'var(--info)' }}>
                  <span className="pulse-dot" style={{ background: 'var(--info)' }}></span>
                  AI Assistant Responding
                </h3>
              </div>
              <div style={{ padding: 16, color: 'var(--text-primary)', lineHeight: 1.6, fontSize: 15 }}>
                {partial}
              </div>
            </div>
          )}
          
          {/* Conversation History */}
          <div className="scroll-area" style={{ flex: 1, padding: 16 }}>
            {logs.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🎙️</div>
                <h4 style={{ marginBottom: 8, color: 'var(--text-secondary)', fontWeight: 600 }}>Ready to Start</h4>
                <p style={{ fontSize: 14 }}>Connect and use the voice assistant to begin your conversation</p>
              </div>
            ) : (
              <div className="chat-container">
                {logs.map((log, i) => {
                  const isUser = log.startsWith('User:');
                  const isAssistant = log.startsWith('Assistant:');
                  const isEvent = !isUser && !isAssistant;
                  return (
                    <div key={i} className={`chat-row ${isUser ? 'user' : isAssistant ? 'assistant' : 'event'}`}>
                      {!isUser && (
                        <div className="chat-avatar">
                          {isAssistant ? '🤖' : '🛈'}
                        </div>
                      )}
                      <div className={`chat-bubble ${isUser ? 'bubble-user' : isAssistant ? 'bubble-assistant' : 'bubble-event'}`}>
                        {log}
                        <div className="chat-actions">
                          {/* future quick actions: copy, retry, etc. */}
                        </div>
                      </div>
                      {isUser && (
                        <div className="chat-avatar">🧑</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}