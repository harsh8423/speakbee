"use client";
import React, { useEffect, useState } from "react";
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
        <h1 className="page-title">
          🏠 Dashboard
        </h1>
        <p className="page-subtitle">
          Overview of your AI voice intelligence platform
        </p>
      </div>

      <div className="page-content">
        {/* Connection Status */}
        <div className="content-section">
          <h2 className="section-title">
            🔗 Backend Connection
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className={`status-indicator ${connected ? 'status-connected' : 'status-disconnected'}`}>
                <div className="pulse-dot"></div>
                {connected ? 'Connected to Backend' : 'Disconnected from Backend'}
              </div>
              {speaker && (
                <div className="badge badge-info">
                  🎤 {speaker}
                </div>
              )}
            </div>
            
            {!connected ? (
              <button onClick={connectWs} className="btn btn-primary">
                🔌 Connect to Backend
              </button>
            ) : (
              <button onClick={disconnectWs} className="btn btn-danger">
                🔌 Disconnect
              </button>
            )}
          </div>
          
          <div style={{ 
            padding: '16px',
            background: connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${connected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '12px',
            fontSize: '14px',
            color: connected ? 'var(--success-dark)' : 'var(--danger-dark)'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>
              {connected ? '✅ Connection Established' : '❌ Connection Required'}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>
              {connected 
                ? 'Backend services are online and ready for voice interactions, audio processing, and speaker recognition.'
                : 'Click "Connect to Backend" to enable voice assistant, audio analysis, and speaker management features.'
              }
            </div>
          </div>
          
          {logs.length > 0 && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                Recent Activity
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {logs.map((log, i) => (
                  <div 
                    key={i} 
                    className="card"
                    style={{ 
                      padding: '8px 12px',
                      background: 'var(--gray-50)',
                      border: '1px solid var(--border-light)',
                      fontSize: '12px',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          <div className="content-section">
            <h2 className="section-title">
              👥 Enrolled Speakers
            </h2>
            <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {stats.totalSpeakers}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Total registered voice profiles
            </p>
          </div>

          <div className="content-section">
            <h2 className="section-title">
              🎤 Voice Sessions
            </h2>
            <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {stats.totalSessions}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Completed voice interactions
            </p>
          </div>

          <div className="content-section">
            <h2 className="section-title">
              📊 Audio Analyses
            </h2>
            <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {stats.totalAnalyses}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Diarization processes completed
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="content-section">
          <h2 className="section-title">
            ⚡ Quick Actions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <a href="/voice-assistant" className="btn btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>
              🎤 Start Voice Chat
            </a>
            <a href="/audio-analysis" className="btn btn-secondary" style={{ textDecoration: 'none', textAlign: 'center' }}>
              🎵 Analyze Audio
            </a>
            <a href="/speaker-management" className="btn btn-outline" style={{ textDecoration: 'none', textAlign: 'center' }}>
              👥 Manage Speakers
            </a>
            <a href="/results" className="btn btn-info" style={{ textDecoration: 'none', textAlign: 'center' }}>
              📊 View Results
            </a>
          </div>
        </div>

        {/* System Status */}
        <div className="content-section">
          <h2 className="section-title">
            ⚙️ System Status
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div className={`badge ${connected ? 'badge-success' : 'badge-danger'}`} style={{ marginBottom: '8px' }}>
                {connected ? '✅' : '❌'} Backend
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                {connected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className={`badge ${connected ? 'badge-success' : 'badge-warning'}`} style={{ marginBottom: '8px' }}>
                {connected ? '✅' : '⚠️'} Audio Processing
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                {connected ? 'Ready' : 'Waiting'}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className={`badge ${connected ? 'badge-success' : 'badge-warning'}`} style={{ marginBottom: '8px' }}>
                {connected ? '✅' : '⚠️'} Voice Recognition
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                {connected ? 'Active' : 'Standby'}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className={`badge ${connected ? 'badge-success' : 'badge-warning'}`} style={{ marginBottom: '8px' }}>
                {connected ? '✅' : '⚠️'} Speaker Diarization
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                {connected ? 'Available' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}