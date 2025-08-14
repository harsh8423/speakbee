"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConnection } from "../contexts/ConnectionContext";

export default function Layout({ children }) {
  const pathname = usePathname();
  const { connected } = useConnection();

  const navItems = [
    { href: "/", label: "Dashboard", icon: "/chart.svg" },
    { href: "/voice-assistant", label: "Voice Assistant", icon: "/mic.svg" },
    { href: "/audio-analysis", label: "Audio Analysis", icon: "/wave.svg" },
    { href: "/speaker-management", label: "Speaker Management", icon: "/users.svg" },
    { href: "/results", label: "Results", icon: "/chart.svg" }
  ];

  return (
    <div className="app-layout">
      {/* Navigation Header */}
      <header className="nav-header">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="brand-icon">
              <Image src="/globe.svg" alt="speakBee" width={22} height={22} />
            </div>
            <div className="brand-text">
              <h1>speakBee</h1>
              <p>AI Voice Intelligence</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <nav className="nav-menu">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                >
                  <span className="nav-icon"><Image src={item.icon} alt="" width={18} height={18} /></span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </nav>
            
            {/* Global Connection Status */}
            <div className={`nav-status ${connected ? 'connected' : 'disconnected'}`}>
              <div className="pulse-dot" style={{ 
                background: connected ? 'var(--success)' : 'var(--danger)',
                width: '8px',
                height: '8px'
              }}></div>
              <span style={{ 
                fontSize: '12px',
                color: connected ? 'var(--success-dark)' : 'var(--danger-dark)',
                fontWeight: '500'
              }}>
                {connected ? 'Backend Online' : 'Backend Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p>&copy; 2024 speakBee. AI-Powered Voice Intelligence Platform.</p>
        </div>
      </footer>
    </div>
  );
}