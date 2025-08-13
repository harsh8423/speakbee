"use client";
import React, { useState } from "react";
import Layout from "../../components/Layout";
import Image from "next/image";
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
        <div className="content-section compact">
          <div className="card-header">
            <h2 className="card-title">
              <Image src="/users.svg" alt="" width={18} height={18} />
              Enroll New Speaker
            </h2>
          </div>
          <div style={{ paddingTop: 12 }}>
            <EnrollForm onEnrolled={(res) => setLogs((l) => [`[enrolled] ${res.name} (${res.speaker_id})`, ...l])} />

            {/* Enrollment Tips */}
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">
                <h3 className="card-title">
                  <Image src="/tips.svg" alt="" width={16} height={16} />
                  Enrollment Tips
                </h3>
              </div>
              <div style={{ padding: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                <ul className="bullets bullets-check">
                  <li>2–3s of clear speech</li>
                  <li>Quiet environment</li>
                  <li>Same microphone</li>
                  <li>Minimize noise/echo</li>
                  <li>Unique speaker name</li>
                </ul>
              </div>
            </div>

            {/* Recent Activity */}
            {logs.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header">
                  <h3 className="card-title">🕑 Recent Activity</h3>
                </div>
                <div className="scroll-area" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
                  {logs.slice(0, 6).map((log, i) => (
                    <div key={i} className="card" style={{ padding: '8px 12px', background: 'var(--gray-50)', border: '1px solid var(--border-light)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enrolled Speakers List */}
        <div style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
          <EnrollmentList />
        </div>
      </div>

        {/* Speaker Management Guide */}
        <div className="content-section container-narrow">
          <div className="card-header">
            <h2 className="card-title">
              <Image src="/book.svg" alt="" width={18} height={18} />
              Speaker Management Guide
            </h2>
          </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
          <div>
              <h4 className="card-title" style={{ padding: 0 }}>
                <Image src="/users.svg" alt="" width={16} height={16} />
                Why Enroll Speakers?
              </h4>
            <ul className="bullets bullets-dot">
              <li>Improves diarization accuracy</li>
              <li>Identifies known speakers</li>
              <li>Enables personalized responses</li>
            </ul>
          </div>
          
          <div>
              <h4 className="card-title" style={{ padding: 0 }}>
                <Image src="/wrench.svg" alt="" width={16} height={16} />
                How It Works
              </h4>
            <ul className="bullets bullets-dot">
              <li>Capture a short voice sample</li>
              <li>Extract a unique voice fingerprint</li>
              <li>Match during future analyses</li>
            </ul>
          </div>
          
          <div>
              <h4 className="card-title" style={{ padding: 0 }}>
                <Image src="/checklist.svg" alt="" width={16} height={16} />
                Best Practices
              </h4>
              <ul className="bullets bullets-check">
                <li>Quiet environment</li>
                <li>Consistent microphone</li>
                <li>Re-enroll after big changes</li>
                <li>Test recognition</li>
                <li>Descriptive, unique names</li>
              </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}