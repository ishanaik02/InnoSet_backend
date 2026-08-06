import axios from 'axios';
import { getToken } from '../utils/tokenStorage';

// Deployed backend on Railway (MongoDB Atlas as the database).
export const BASE_URL = 'https://mobileapplication-production-4e2b.up.railway.app/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// React Native's <Image> component can't easily attach an Authorization
// header, so the receipt-file route also accepts ?token=. This builds that
// URL for a given trip/receipt so it can be dropped straight into
// <Image source={{ uri }}> (used by both the engineer and admin screens).
export async function getReceiptUri(tripId, receiptId) {
  const token = await getToken();
  return `${BASE_URL}/trips/${tripId}/receipts/${receiptId}?token=${token}`;
}

export default api;
