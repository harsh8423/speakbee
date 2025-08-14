"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Layout from "../components/Layout";
import { useConnection } from "../contexts/ConnectionContext";

export default function Dashboard() {
  const { connected, speaker, logs, connectWs, disconnectWs } = useConnection();
  const [stats, setStats] = useState({
    totalSpeakers: 0,
    totalSessions: 0,
    totalAnalyses: 0
  });

  useEffect(() => {
    // Load real stats from API and localStorage
    const loadStats = async () => {
      try {
        // Load speakers count
        const enrollments = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_HTTP_URL || 'http://127.0.0.1:8000'}/enrollments`);
        if (enrollments.ok) {
          const data = await enrollments.json();
          setStats(prev => ({
            ...prev,
            totalSpeakers: data.items?.length || 0
          }));
        }
        
        // Load analyses count from localStorage
        const savedResults = JSON.parse(localStorage.getItem('speakbee-results') || '[]');
        setStats(prev => ({
          ...prev,
          totalAnalyses: savedResults.length,
          totalSessions: logs.length
        }));
      } catch (error) {
        console.log('Could not load stats:', error);
      }
    };

    loadStats();

    // Cleanup handled by ConnectionProvider
  }, [logs.length]);

  return (
    <Layout>
      <div className="page-header">
        <div className="brand-watermark"><Image src="/bee.svg" alt="" width={90} height={90} /></div>
        <h1 className="page-title">
          <Image src="/bee.svg" alt="" width={28} height={28} />
          Dashboard
        </h1>
        <p className="page-subtitle">
          Overview of your AI voice intelligence platform
        </p>
      </div>

      <div className="page-content" style={{ display: 'grid', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px' }}>
          {/* Connection Overview */}
          <div className="content-section">
            <h2 className="section-title"><Image src="/cpu.svg" alt="" width={16} height={16} /> Backend Connection</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className={`status-indicator ${connected ? 'status-connected' : 'status-disconnected'}`}>
                  <div className="pulse-dot"></div>
                  {connected ? 'Connected to Backend' : 'Disconnected from Backend'}
                </div>
                {speaker && (
                  <div className="badge badge-info">🎤 {speaker}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {!connected ? (
                  <button onClick={connectWs} className="btn btn-primary">🔌 Connect</button>
                ) : (
                  <button onClick={disconnectWs} className="btn btn-danger">🔌 Disconnect</button>
                )}
              </div>
            </div>
            <div className="card" style={{ border: '1px solid var(--border-light)', background: connected ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)' }}>
              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: connected ? 'var(--success-dark)' : 'var(--danger-dark)' }}>
                  {connected ? '✅ Connection Established' : '❌ Connection Required'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {connected
                    ? 'Services are online and ready for voice interactions, audio processing, and speaker recognition.'
                    : 'Click Connect to enable voice assistant, audio analysis, and speaker management.'}
                </div>
              </div>
            </div>
            {logs.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>Recent Activity</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                  {logs.map((log, i) => (
                    <div key={i} className="card" style={{ padding: '8px 12px', background: 'var(--gray-50)', border: '1px solid var(--border-light)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="content-section">
            <h2 className="section-title"><Image src="/tips.svg" alt="" width={16} height={16} /> Quick Actions</h2>
            <div className="qa-grid">
              <Link href="/voice-assistant" className="qa-card qa-voice">
                <div className="qa-icon"><Image src="/mic.svg" alt="" width={22} height={22} /></div>
                <div className="qa-content">
                  <div className="qa-title">Start Voice Chat</div>
                  <div className="qa-sub">Realtime conversation with AI</div>
                </div>
                <div className="qa-arrow">→</div>
              </Link>
              <Link href="/audio-analysis" className="qa-card qa-analysis">
                <div className="qa-icon"><Image src="/wave.svg" alt="" width={22} height={22} /></div>
                <div className="qa-content">
                  <div className="qa-title">Analyze Audio</div>
                  <div className="qa-sub">Diarization and transcription</div>
                </div>
                <div className="qa-arrow">→</div>
              </Link>
              <Link href="/speaker-management" className="qa-card qa-speakers">
                <div className="qa-icon"><Image src="/users.svg" alt="" width={22} height={22} /></div>
                <div className="qa-content">
                  <div className="qa-title">Manage Speakers</div>
                  <div className="qa-sub">Enroll and maintain profiles</div>
                </div>
                <div className="qa-arrow">→</div>
              </Link>
              <Link href="/results" className="qa-card qa-results">
                <div className="qa-icon"><Image src="/chart.svg" alt="" width={22} height={22} /></div>
                <div className="qa-content">
                  <div className="qa-title">View Results</div>
                  <div className="qa-sub">Browse saved analyses</div>
                </div>
                <div className="qa-arrow">→</div>
              </Link>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.totalSpeakers}</div>
            <div className="stat-label">Enrolled Speakers</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalSessions}</div>
            <div className="stat-label">Voice Sessions</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalAnalyses}</div>
            <div className="stat-label">Audio Analyses</div>
          </div>
        </div>

        {/* System Status */}
        <div className="content-section">
          <h2 className="section-title"><Image src="/output.svg" alt="" width={16} height={16} /> System Status</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div className={`badge ${connected ? 'badge-success' : 'badge-danger'}`} style={{ marginBottom: 8 }}>{connected ? '✅' : '❌'} Backend</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{connected ? 'Connected' : 'Disconnected'}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className={`badge ${connected ? 'badge-success' : 'badge-warning'}`} style={{ marginBottom: 8 }}>{connected ? '✅' : '⚠️'} Audio Processing</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{connected ? 'Ready' : 'Waiting'}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className={`badge ${connected ? 'badge-success' : 'badge-warning'}`} style={{ marginBottom: 8 }}>{connected ? '✅' : '⚠️'} Voice Recognition</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{connected ? 'Active' : 'Standby'}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className={`badge ${connected ? 'badge-success' : 'badge-warning'}`} style={{ marginBottom: 8 }}>{connected ? '✅' : '⚠️'} Speaker Diarization</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{connected ? 'Available' : 'Offline'}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}