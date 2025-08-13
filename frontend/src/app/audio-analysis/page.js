"use client";
import React, { useState } from "react";
import Layout from "../../components/Layout";
import Image from "next/image";
import AudioProcessor from "../../components/AudioProcessor";
import DiarizationResults from "../../components/DiarizationResults";

export default function AudioAnalysis() {
  const [diarizationResults, setDiarizationResults] = useState(null);
  const [logs, setLogs] = useState([]);
  const [lastFile, setLastFile] = useState("");

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

      <div className="page-content two-col" style={{ gridTemplateColumns: '1fr 1.25fr' }}>
        {/* Audio Upload & Processing */}
        <div className="content-section">
          <div className="card-header">
            <h2 className="card-title">
              <Image src="/upload.svg" alt="" width={18} height={18} />
              Audio Processing
            </h2>
          </div>
          <div style={{ paddingTop: 12, display: 'grid', gap: 16 }}>
            {/* Dropzone */}
            <label className="dropzone" htmlFor="file-input">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Image src="/upload.svg" alt="" width={20} height={20} />
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Drop WAV file here or click to browse</div>
              </div>
              {lastFile && <div className="file-name">Last selected: {lastFile}</div>}
            </label>

            {/* Actual processor */}
            <div>
              <AudioProcessor 
                onResult={(r) => { setDiarizationResults(r); }} 
                onWarn={(m) => setLogs((l) => [m, ...l])} 
              />
            </div>

            {/* Processing Logs */}
            <div className="card" style={{ padding: 0 }}>
              <div className="card-header">
                <h3 className="card-title">
                  <Image src="/list.svg" alt="" width={16} height={16} />
                  Processing Log
                </h3>
              </div>
              <div className="scroll-area" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
                {logs.length === 0 ? (
                  <div className="empty-state" style={{ padding: 20 }}>No logs yet</div>
                ) : (
                  logs.slice(0, 12).map((log, i) => (
                    <div key={i} className="card" style={{ padding: '8px 12px', background: 'var(--gray-50)', border: '1px solid var(--border-light)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Results */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <DiarizationResults results={diarizationResults} />
        </div>
      </div>

      {/* Analysis Guide */}
      <div className="content-section">
        <h2 className="section-title">📖 Analysis Guide</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div>
            <h4 className="card-title" style={{ padding: 0 }}>
              <Image src="/folder.svg" alt="" width={16} height={16} />
              Supported Formats
            </h4>
            <ul className="bullets bullets-dot">
              <li>WAV, 16kHz</li>
              <li>Mono or stereo</li>
              <li>Max 10MB</li>
            </ul>
          </div>
          <div>
            <h4 className="card-title" style={{ padding: 0 }}>
              <Image src="/tips.svg" alt="" width={16} height={16} />
              Best Results
            </h4>
            <ul className="bullets bullets-check">
              <li>Clear speech</li>
              <li>Distinct speakers</li>
              <li>30s–10min audio</li>
            </ul>
          </div>
          <div>
            <h4 className="card-title" style={{ padding: 0 }}>
              <Image src="/output.svg" alt="" width={16} height={16} />
              Analysis Output
            </h4>
            <ul className="bullets bullets-dot">
              <li>Speakers + time</li>
              <li>Transcription</li>
              <li>Similarity score</li>
            </ul>
          </div>
          <div>
            <h4 className="card-title" style={{ padding: 0 }}>
              <Image src="/tips.svg" alt="" width={16} height={16} />
              Quick Tips
            </h4>
            <ul className="bullets bullets-check">
              <li>Enroll first</li>
              <li>Use record</li>
              <li>Check logs</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Summary after results */}
      {diarizationResults && (
        <div className="content-section">
          <h2 className="section-title">📌 Summary</h2>
          <div className="summary-grid">
            <div className="summary-tile">
              <div className="summary-number">{diarizationResults.segments?.length || 0}</div>
              <div className="summary-label">Segments</div>
            </div>
            <div className="summary-tile">
              <div className="summary-number">{(() => {
                const speakers = new Set((diarizationResults.segments || []).map(s => s.diar_label || s.speaker_id).filter(Boolean));
                return speakers.size;
              })()}</div>
              <div className="summary-label">Speakers</div>
            </div>
            <div className="summary-tile">
              <div className="summary-number">{(() => {
                if (!diarizationResults.segments || diarizationResults.segments.length === 0) return 0;
                const total = diarizationResults.segments.reduce((acc, s) => acc + (s.end - s.start), 0);
                return Math.max(1, Math.round(total));
              })()}s</div>
              <div className="summary-label">Duration</div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}