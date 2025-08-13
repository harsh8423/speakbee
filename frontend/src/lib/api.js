// Backend API helpers for speakBee

export const WS_URL = (typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_BACKEND_WS_URL || `ws://127.0.0.1:8000/ws/stream`)) || '';
export const API_BASE = (typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_BACKEND_HTTP_URL || `http://127.0.0.1:8000`)) || '';

export async function listEnrollments() {
  const res = await fetch(`${API_BASE}/enrollments`);
  if (!res.ok) throw new Error('Failed to fetch enrollments');
  return res.json();
}

export async function deleteEnrollment(speakerId) {
  const res = await fetch(`${API_BASE}/enrollments/${encodeURIComponent(speakerId)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete enrollment');
  return res.json();
}

export async function enrollSpeaker(blob, name) {
  const fd = new FormData();
  fd.append('audio', blob, 'enroll.wav');
  fd.append('name', name);
  const res = await fetch(`${API_BASE}/enroll`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Failed to enroll');
  return res.json();
}

