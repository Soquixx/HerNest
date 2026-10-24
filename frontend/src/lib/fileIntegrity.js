export async function sha256(blob) {
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 requires a secure browser context such as localhost or HTTPS.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}
