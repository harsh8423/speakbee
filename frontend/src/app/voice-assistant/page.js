"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WS_URL } from "../../lib/api";
import Layout from "../../components/Layout";
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

      <div className="page-content" style={{ gridTemplateColumns: '1fr 2fr', alignItems: 'start' }}>
        {/* Voice Controls */}
        <div className="content-section">
          <h2 className="section-title">
            🎙️ Voice Controls
          </h2>
          
          {/* Connection Status */}
          <div style={{ marginBottom: '24px' }}>
            <div className={`status-indicator ${connected ? 'status-connected' : 'status-disconnected'}`}>
              <div className="pulse-dot"></div>
              {connected ? 'Connected' : 'Disconnected'}
              {speaker && <span>• {speaker}</span>}
            </div>
            
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              {!connected ? (
                <button onClick={connectWs} className="btn btn-primary">
                  Connect
                </button>
              ) : (
                <button onClick={disconnectWs} className="btn btn-danger">
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Push to Talk */}
          <PushToTalk 
            connected={connected} 
            onSend={onSendAudio} 
            onWarn={(m) => setLogs((l) => [m, ...l])} 
          />
        </div>

        {/* Conversation */}
        <div className="content-section" style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
          <h2 className="section-title">
            💬 Live Conversation
          </h2>

          {/* Streaming Response */}
          {partial && (
            <div className="card" style={{ 
              border: '2px solid var(--info)',
              background: 'rgba(59, 130, 246, 0.02)',
              marginBottom: '20px'
            }}>
              <div style={{ 
                padding: '16px',
                borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                background: 'rgba(59, 130, 246, 0.02)'
              }}>
                <h3 style={{ 
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--info)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div className="pulse-dot" style={{ background: 'var(--info)' }}></div>
                  🤖 AI Assistant Responding
                </h3>
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ 
                  color: 'var(--text-primary)', 
                  lineHeight: '1.6',
                  fontSize: '15px'
                }}>
                  {partial}
                </div>
              </div>
            </div>
          )}
          
          {/* Conversation History */}
          <div style={{ 
            flex: 1,
            overflowY: 'auto',
            maxHeight: '500px'
          }}>
            {logs.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: 'var(--text-muted)', 
                fontSize: '15px',
                marginTop: '80px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🎙️</div>
                <h4 style={{ 
                  marginBottom: '8px', 
                  color: 'var(--text-secondary)',
                  fontWeight: '600'
                }}>
                  Ready to Start
                </h4>
                <p>Connect and use the voice assistant to begin your conversation</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {logs.map((log, i) => (
                  <div 
                    key={i} 
                    className="card"
                    style={{ 
                      padding: '12px 16px',
                      background: log.startsWith('User:') 
                        ? 'var(--gray-50)'
                        : log.startsWith('Assistant:') 
                        ? 'var(--bg-primary)'
                        : 'var(--gray-50)',
                      border: `1px solid ${
                        log.startsWith('User:') ? 'var(--border-medium)' :
                        log.startsWith('Assistant:') ? 'var(--border-light)' :
                        'var(--border-light)'
                      }`,
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      animation: 'fadeInUp 0.3s ease-out'
                    }}
                  >
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}