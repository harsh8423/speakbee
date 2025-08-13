"use client";
import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { WS_URL } from "../lib/api";

const ConnectionContext = createContext();

export function ConnectionProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [speaker, setSpeaker] = useState(null);
  const [logs, setLogs] = useState([]);
  const wsRef = useRef(null);

  const wsUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return WS_URL || `ws://${window.location.hostname}:8000/ws/stream`;
  }, []);

  const connectWs = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        setConnected(true);
        setLogs((l) => ["[system] Connected to backend", ...l.slice(0, 9)]);
      };

      ws.onclose = () => {
        setConnected(false);
        setSpeaker(null);
        setLogs((l) => [
          "[system] Disconnected from backend",
          ...l.slice(0, 9),
        ]);
      };

      ws.onerror = () => {
        setConnected(false);
        setLogs((l) => ["[system] Connection error", ...l.slice(0, 9)]);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "event") {
            setLogs((l) => [
              `[${msg.event}] ${msg.text || ""}`,
              ...l.slice(0, 9),
            ]);
          } else if (
            msg.event === "known_speaker" ||
            msg.type === "known_speaker"
          ) {
            const name = msg.name || null;
            const score =
              typeof msg.score === "number" ? msg.score.toFixed(3) : undefined;
            setSpeaker(name ? `${name}${score ? ` (${score})` : ""}` : null);
          }
        } catch {
          // ignore binary messages
        }
      };

      wsRef.current = ws;
    } catch (error) {
      setConnected(false);
      setLogs((l) => [
        `[system] Failed to connect: ${error.message}`,
        ...l.slice(0, 9),
      ]);
    }
  }, [wsUrl]);

  const disconnectWs = useCallback(() => {
    try {
      const ws = wsRef.current;
      ws?.close();
    } catch {}
    setConnected(false);
    setSpeaker(null);
  }, []);

  const sendAudio = useCallback((wavBuf) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(wavBuf);
      setLogs((l) => ["[sent] Audio data", ...l.slice(0, 9)]);
      return true;
    } else {
      setLogs((l) => ["[error] Not connected to backend", ...l.slice(0, 9)]);
      return false;
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

  const value = {
    connected,
    speaker,
    logs,
    connectWs,
    disconnectWs,
    sendAudio,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error("useConnection must be used within a ConnectionProvider");
  }
  return context;
}
