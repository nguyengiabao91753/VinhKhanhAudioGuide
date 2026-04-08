const crypto = require('crypto');

const DEFAULT_REDIRECT = 'https://audio-tour-jet.vercel.app/';
const DEFAULT_CHECK_BASE_URL = 'http://localhost:5174';

function generateUniqueId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

function createQrPayload(
  redirectUrl = DEFAULT_REDIRECT,
  validHours = 1/60,
  checkBaseUrl = DEFAULT_CHECK_BASE_URL
) {
  const now = new Date();
  const from = now.toISOString();
  const to = new Date(now.getTime() + validHours * 60 * 60 * 1000).toISOString();
  const id = generateUniqueId();
  const base = normalizeBaseUrl(checkBaseUrl);

  const checkUrl = `${base}/checkQR` +
    `?redirect=${encodeURIComponent(redirectUrl)}` +
    `&from=${encodeURIComponent(from)}` +
    `&to=${encodeURIComponent(to)}` +
    `&id=${encodeURIComponent(id)}`;

  return {
    redirectUrl,
    from,
    to,
    id,
    checkUrl,
  };
}

module.exports = {
  createQrPayload,
};