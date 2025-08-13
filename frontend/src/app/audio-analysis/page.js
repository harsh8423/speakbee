"use client";
import React, { useState } from "react";
import Layout from "../../components/Layout";
import AudioProcessor from "../../components/AudioProcessor";
import DiarizationResults from "../../components/DiarizationResults";

export default function AudioAnalysis() {
  const [diarizationResults, setDiarizationResults] = useState(null);
  const [logs, setLogs] = useState([]);

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">
          🎵 Audio Analysis
        </h1>
        <p className="page-subtitle">
          Upload and analyze audio files for speaker diarization and transcription
        </p>
      </div>

      <div className="page-content" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        {/* Audio Upload & Processing */}
        <div className="content-section">
          <h2 className="section-title">
            📁 Audio Processing
          </h2>
          <AudioProcessor 
            onResult={setDiarizationResults} 
            onWarn={(m) => setLogs((l) => [m, ...l])} 
          />

          {/* Processing Logs */}
          {logs.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                marginBottom: '12px', 
                color: 'var(--text-primary)' 
              }}>
                Processing Log
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {logs.slice(0, 5).map((log, i) => (
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

        {/* Analysis Results */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <DiarizationResults results={diarizationResults} />
        </div>
      </div>

      {/* Analysis Guide */}
      <div className="content-section">
        <h2 className="section-title">
          📖 Analysis Guide
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
              📂 Supported Formats
            </h4>
            <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, paddingLeft: '16px' }}>
              <li>WAV files (recommended)</li>
              <li>16kHz sample rate</li>
              <li>Mono or stereo audio</li>
              <li>Maximum 10MB file size</li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
              🎯 Best Results
            </h4>
            <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, paddingLeft: '16px' }}>
              <li>Clear speech with minimal background noise</li>
              <li>Multiple speakers with distinct voices</li>
              <li>Audio length: 30 seconds to 10 minutes</li>
              <li>Good audio quality (no distortion)</li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
              📊 Analysis Output
            </h4>
            <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, paddingLeft: '16px' }}>
              <li>Speaker identification and timestamps</li>
              <li>Speech transcription</li>
              <li>Speaker similarity scores</li>
              <li>Language detection (if available)</li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
              ⚡ Quick Tips
            </h4>
            <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, paddingLeft: '16px' }}>
              <li>Enroll speakers first for better recognition</li>
              <li>Use the record feature for quick testing</li>
              <li>Check processing logs for any issues</li>
              <li>Results appear automatically after processing</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}