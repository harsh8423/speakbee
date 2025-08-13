"use client";
import React, { useEffect, useState } from "react";
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
        <div style={{ fontWeight: 600 }}>Enrolled Speakers</div>
        <button onClick={refresh} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #607d8b', background: '#607d8b', color: '#fff', cursor: 'pointer' }}>Refresh</button>
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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e0e0e0' }}>Speaker ID</th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e0e0e0' }}>Name</th>
                  <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e0e0e0' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.speaker_id}>
                    <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace' }}>{it.speaker_id}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{it.name}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                      <button onClick={() => remove(it.speaker_id)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #b71c1c', background: '#b71c1c', color: '#fff', cursor: 'pointer' }}>Delete</button>
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

