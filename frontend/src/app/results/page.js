"use client";
import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import Image from "next/image";
import DiarizationResults from "../../components/DiarizationResults";

export default function Results() {
  const [savedResults, setSavedResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);

  useEffect(() => {
    // Load saved results from localStorage or API
    const loadSavedResults = () => {
      try {
        const saved = localStorage.getItem('speakbee-results');
        if (saved) {
          setSavedResults(JSON.parse(saved));
        }
      } catch (error) {
        console.log('Could not load saved results:', error);
      }
    };

    loadSavedResults();
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">
          <Image src="/chart.svg" alt="" width={26} height={26} />
          Analysis Results
        </h1>
        <p className="page-subtitle">
          View and manage your saved audio analysis results and speaker diarization data
        </p>
      </div>

      <div className="page-content two-col" style={{ gridTemplateColumns: '0.9fr 1.4fr', alignItems: 'start' }}>
        {/* Saved Results List */}
        <div className="content-section compact">
          <div className="card-header compact">
            <h2 className="card-title">
              <Image src="/list.svg" alt="" width={18} height={18} />
              Saved Results
            </h2>
          </div>
          
          {savedResults.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📊</div>
              <h4 style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                No Results Yet
              </h4>
              <p style={{ fontSize: '14px', lineHeight: '1.5' }}>
                Process some audio files to see results here
              </p>
            </div>
          ) : (
            <div className="scroll-area" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
              {savedResults.map((result) => (
                <div 
                  key={result.id}
                  className="card"
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    border: selectedResult?.id === result.id ? '2px solid var(--black)' : '1px solid var(--border-light)',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setSelectedResult(result)}
                  onMouseEnter={(e) => {
                    if (selectedResult?.id !== result.id) {
                      e.currentTarget.style.borderColor = 'var(--border-medium)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedResult?.id !== result.id) {
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                    }
                  }}
                >
                  <div style={{ 
                    fontWeight: '600', 
                    color: 'var(--text-primary)', 
                    fontSize: '14px',
                    marginBottom: '4px'
                  }}>
                    {result.name}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-muted)',
                    marginBottom: '8px'
                  }}>
                    {new Date(result.date).toLocaleDateString()}
                  </div>
                  <div className="badge badge-secondary">
                    {result.segments.length} segments
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header compact">
              <h3 className="card-title">
                <Image src="/chart.svg" alt="" width={16} height={16} />
                Quick Actions
              </h3>
            </div>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '12px', 
              color: 'var(--text-primary)' 
            }}>
              
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="/audio-analysis" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                🎵 Analyze New Audio
              </a>
              <button className="btn btn-outline btn-sm" disabled>
                📤 Export Results
              </button>
              <button className="btn btn-outline btn-sm" disabled>
                🗑️ Clear All Results
              </button>
            </div>
          </div>
        </div>

        {/* Result Details */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {selectedResult ? (
            <DiarizationResults results={selectedResult} />
          ) : (
            <div className="content-section" style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px'
            }}>
              <div style={{ marginBottom: '16px', opacity: 0.6 }}>
                <Image src="/chart.svg" alt="" width={56} height={56} />
              </div>
              <h3 style={{ 
                marginBottom: '8px', 
                color: 'var(--text-secondary)', 
                fontWeight: '600',
                fontSize: '18px'
              }}>
                Select a Result
              </h3>
              <p style={{ 
                fontSize: '14px', 
                color: 'var(--text-muted)',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                Choose a saved analysis result from the list to view detailed speaker diarization and transcription data
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Results Statistics */}
      <div className="content-section">
        <h2 className="section-title">
          📈 Analysis Statistics
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {savedResults.length}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Total Analyses
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {savedResults.reduce((acc, result) => acc + result.segments.length, 0)}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Total Segments
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {savedResults.filter(r => r.segments.some(s => s.speaker_id)).length}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              With Known Speakers
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {Math.round(savedResults.reduce((acc, result) => {
                const avgSim = result.segments.reduce((sum, seg) => sum + (seg.similarity || 0), 0) / result.segments.length;
                return acc + avgSim;
              }, 0) / savedResults.length * 100) || 0}%
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Avg. Confidence
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}