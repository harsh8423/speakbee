"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { listEnrollments, deleteEnrollment } from "../lib/api";

export default function EnrollmentList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await listEnrollments();
      setItems(data.items || []);
    } catch (e) {
      setError(e?.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const remove = async (speakerId) => {
    try {
      await deleteEnrollment(speakerId);
      setItems((prev) => prev.filter((x) => x.speaker_id !== speakerId));
    } catch (e) {
      setError(e?.message || "Failed to delete");
    }
  };

  return (
    <div style={{ border: '1px solid #e5eaf0', borderRadius: 12, padding: 16, background: '#fcfdff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image src="/users.svg" alt="" width={16} height={16} />
          Enrolled Speakers
        </div>
        <button onClick={refresh} className="btn btn-outline btn-sm">Refresh</button>
      </div>
      {loading ? (
        <div style={{ marginTop: 12 }}>Loading…</div>
      ) : error ? (
        <div style={{ marginTop: 12, color: '#c62828' }}>{error}</div>
      ) : (
        <div style={{ marginTop: 12 }}>
          {items.length === 0 ? (
            <div style={{ fontSize: 13, color: '#666' }}>No enrollments yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Speaker ID</th>
                  <th>Name</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.speaker_id}>
                    <td style={{ fontFamily: 'monospace' }}>{it.speaker_id}</td>
                    <td>{it.name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => remove(it.speaker_id)} className="btn btn-danger btn-sm" title="Delete">
                        <Image src="/trash.svg" alt="" width={14} height={14} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

