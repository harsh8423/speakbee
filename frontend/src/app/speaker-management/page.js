"use client";
import React, { useState } from "react";
import Layout from "../../components/Layout";
import EnrollForm from "../../components/EnrollForm";
import EnrollmentList from "../../components/EnrollmentList";

export default function SpeakerManagement() {
  const [logs, setLogs] = useState([]);

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">
          👥 Speaker Management
        </h1>
        <p className="page-subtitle">
          Enroll new speakers and manage existing voice profiles for better recognition
        </p>
      </div>

      <div className="page-content" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        {/* Speaker Enrollment */}
        <div className="content-section">
          <h2 className="section-title">
            ➕ Enroll New Speaker
          </h2>
          <EnrollForm onEnrolled={(res) => setLogs((l) => [`[enrolled] ${res.name} (${res.speaker_id})`, ...l])} />

          {/* Enrollment Tips */}
          <div style={{ 
            marginTop: '24px',
            padding: '16px',
            background: 'var(--gray-50)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
              💡 Enrollment Tips
            </h4>
            <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, paddingLeft: '16px', lineHeight: '1.6' }}>
              <li>Record 2-3 seconds of clear speech</li>
              <li>Speak naturally in a quiet environment</li>
              <li>Use the same microphone for consistency</li>
              <li>Avoid background noise and echo</li>
              <li>Each speaker needs a unique name</li>
            </ul>
          </div>

          {/* Recent Activity */}
          {logs.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                marginBottom: '12px', 
                color: 'var(--text-primary)' 
              }}>
                Recent Activity
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

        {/* Enrolled Speakers List */}
        <div style={{ 
          height: '600px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <EnrollmentList />
        </div>
      </div>

      {/* Speaker Management Guide */}
      <div className="content-section">
        <h2 className="section-title">
          📚 Speaker Management Guide
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
              🎯 Why Enroll Speakers?
            </h4>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
              Speaker enrollment creates voice profiles that help the system identify specific individuals 
              in audio recordings. This improves accuracy in speaker diarization and enables personalized 
              voice interactions.
            </p>
          </div>
          
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
              🔧 How It Works
            </h4>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
              The system analyzes voice characteristics like pitch, tone, and speech patterns to create 
              a unique voice fingerprint. This profile is then used to identify the speaker in future 
              audio analysis and voice assistant interactions.
            </p>
          </div>
          
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
              📈 Best Practices
            </h4>
            <ul style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, paddingLeft: '16px', lineHeight: '1.6' }}>
              <li>Enroll speakers in a quiet environment</li>
              <li>Use consistent microphone setup</li>
              <li>Re-enroll if voice changes significantly</li>
              <li>Test recognition after enrollment</li>
              <li>Keep speaker names descriptive and unique</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}