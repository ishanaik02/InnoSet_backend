import api from './api';
import { registerUploadFunction } from './backgroundLocationService';

export const createTrip = (payload) => api.post('/trips', payload).then((r) => r.data);

export const updateTrip = (tripId, payload) =>
  api.patch(`/trips/${tripId}`, payload).then((r) => r.data);

export const getTrips = () => api.get('/trips').then((r) => r.data);

export const getTripById = (tripId) => api.get(`/trips/${tripId}`).then((r) => r.data);

export const submitTrip = (tripId) =>
  api.post(`/trips/${tripId}/submit`).then((r) => r.data);

export const deleteTrip = (tripId) =>
  api.delete(`/trips/${tripId}`).then((r) => r.data);

export const uploadLocationBatch = (tripId, points) =>
  api.post(`/trips/${tripId}/location/batch`, { points }).then((r) => r.data);

registerUploadFunction(uploadLocationBatch);

// Guesses a mime type from a file extension when the picker didn't already
// give us one (older Android gallery URIs sometimes omit it).
function guessMimeType(uriOrName) {
  const ext = (uriOrName || '').split('.').pop()?.toLowerCase();
  const map = {
    pdf: 'application/pdf',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  };
  return map[ext] || 'image/jpeg';
}

/**
 * Uploads a receipt file (photo or PDF) to MongoDB via the backend.
 * `file` can be a plain uri string (legacy callers), or an object
 * { uri, mimeType, name } as returned by ImagePicker/DocumentPicker assets —
 * passing the real mimeType/name matters so a PDF ticket isn't stored (and
 * later previewed) as if it were a JPEG.
 * `extra` can include { amount, notes } which are stored alongside the file.
 */
export const uploadReceipt = (tripId, file, category, extra = {}) => {
  const uri = typeof file === 'string' ? file : file.uri;
  const name = (typeof file === 'object' && file.name) || `receipt_${Date.now()}`;
  const mimeType = (typeof file === 'object' && file.mimeType) || guessMimeType(name || uri);

  const formData = new FormData();
  formData.append('receipt', { uri, name, type: mimeType });
  formData.append('category', category); // 'ticket' | 'hotel' | 'food' | 'other'
  if (extra.amount !== undefined) formData.append('amount', String(extra.amount));
  if (extra.notes) formData.append('notes', extra.notes);

  return api
    .post(`/trips/${tripId}/receipts`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const getDashboardStats = () => api.get('/trips/stats').then((r) => r.data);
