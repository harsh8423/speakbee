"use client";
import React from "react";

export default function DiarizationResults({ results }) {
  if (!results || !results.segments || results.segments.length === 0) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="card-header">
          <h3 className="card-title">
            📊 Diarization Results
          </h3>
        </div>
        <div style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: 'var(--text-muted)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🎭</div>
          <h4 style={{ 
            marginBottom: '8px', 
            color: 'var(--text-secondary)', 
            fontWeight: '600',
            fontSize: '16px'
          }}>
            No Analysis Yet
          </h4>
          <p style={{ fontSize: '14px', textAlign: 'center', lineHeight: '1.5' }}>
            Upload audio to see speaker diarization and analysis results
          </p>
        </div>
      </div>
    );
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const getSpeakerStyle = (speakerId, diarLabel) => {
    if (speakerId) {
      return {
        background: 'var(--success)',
        color: 'white',
        icon: '👤',
        badgeClass: 'badge-success'
      };
    } else {
      const styles = {
        'SPEAKER_00': { 
          background: 'var(--black)',
          color: 'white',
          icon: '🎭',
          badgeClass: 'badge-primary'
        },
        'SPEAKER_01': { 
          background: 'var(--gray-600)',
          color: 'white',
          icon: '🎪',
          badgeClass: 'badge-secondary'
        },
        'SPEAKER_02': { 
          background: 'var(--info)',
          color: 'white',
          icon: '🎨',
          badgeClass: 'badge-info'
        },
        'SPEAKER_03': { 
          background: 'var(--warning)',
          color: 'white',
          icon: '🎯',
          badgeClass: 'badge-warning'
        },
      };
      return styles[diarLabel] || styles['SPEAKER_00'];
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Header */}
      <div className="card-header">
        <h3 className="card-title">
          📊 Speaker Analysis
        </h3>
        <div className="badge badge-primary">
          {results.segments.length} SEGMENTS
        </div>
      </div>

      {/* Segments List */}
      <div style={{ 
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        maxHeight: '600px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {results.segments.map((segment, index) => {
            const speakerStyle = getSpeakerStyle(segment.speaker_id, segment.diar_label);
            
            return (
              <div 
                key={index}
                className="card"
                style={{
                  padding: '16px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                
                {/* Speaker Header */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: speakerStyle.background,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '14px',
                      color: speakerStyle.color
                    }}>
                      {speakerStyle.icon}
                    </div>
                    <div>
                      <div style={{ 
                        fontWeight: '600', 
                        fontSize: '14px',
                        color: 'var(--text-primary)',
                        marginBottom: '2px'
                      }}>
                        {segment.speaker_name || segment.diar_label}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {segment.speaker_id && (
                          <span className="badge badge-success">
                            ID: {segment.speaker_id}
                          </span>
                        )}
                        {segment.similarity && (
                          <span className="badge badge-warning">
                            {(segment.similarity * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                    background: 'var(--gray-50)',
                    border: '1px solid var(--border-light)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontWeight: '500'
                  }}>
                    {formatTime(segment.start)} - {formatTime(segment.end)}
                  </div>
                </div>
                
                {/* Transcript */}
                <div style={{ 
                  fontSize: '13px', 
                  lineHeight: '1.5',
                  color: 'var(--text-primary)',
                  marginBottom: '12px',
                  padding: '10px 12px',
                  background: 'var(--gray-50)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px'
                }}>
                  {segment.text || <em style={{ color: 'var(--text-muted)' }}>No transcription available</em>}
                </div>

                {/* Language Info */}
                {(segment.language || segment.text_original || segment.text_translated) && (
                  <div style={{ 
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    padding: '8px 12px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '6px'
                  }}>
                    {segment.language && (
                      <div style={{ 
                        marginBottom: '6px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px' 
                      }}>
                        <span>🌐</span>
                        <span className={`badge ${speakerStyle.badgeClass}`}>
                          {segment.language.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {segment.text_original && segment.text_original !== segment.text && (
                      <div style={{ marginBottom: '6px' }}>
                        <strong>Original:</strong> {segment.text_original}
                      </div>
                    )}
                    {segment.text_translated && (
                      <div>
                        <strong>Translated:</strong> {segment.text_translated}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        padding: '12px 16px',
        borderTop: '1px solid var(--border-light)',
        fontSize: '11px',
        color: 'var(--text-muted)',
        textAlign: 'center',
        background: 'var(--gray-50)'
      }}>
        💡 <strong>Legend:</strong> Known speakers (👤) vs Unknown speakers (🎭🎪🎨🎯)
      </div>
    </div>
  );
}