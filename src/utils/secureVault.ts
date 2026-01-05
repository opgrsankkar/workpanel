export interface EncryptedPayload {
  version: 1;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSubtleCrypto(): SubtleCrypto {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available');
  }
  return window.crypto.subtle;
}

function getRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.getRandomValues) {
    throw new Error('Crypto.getRandomValues is not available');
  }
  window.crypto.getRandomValues(array);
  return array;
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      // Uint8Array is a valid BufferSource for Web Crypto; assert to satisfy TS dom types
      salt: salt as BufferSource,
      iterations: 200000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptData(password: string, data: unknown): Promise<EncryptedPayload> {
  const salt = getRandomBytes(16);
  const iv = getRandomBytes(12);
  const key = await deriveKey(password, salt);

  const subtle = getSubtleCrypto();
  const plaintext = encoder.encode(JSON.stringify(data));
  const ciphertext = await subtle.encrypt(
    // iv is a Uint8Array, which is a valid BufferSource at runtime
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext,
  );

  return {
    version: 1,
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertext),
  };
}

export async function decryptData(password: string, payload: EncryptedPayload): Promise<unknown> {
  if (payload.version !== 1) {
    throw new Error('Unsupported vault version');
  }

  const salt = base64ToBuffer(payload.salt);
  const iv = base64ToBuffer(payload.iv);
  const key = await deriveKey(password, salt);
  const subtle = getSubtleCrypto();

  try {
    const ciphertext = base64ToBuffer(payload.ciphertext);
    const decrypted = await subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource,
    );
    const json = decoder.decode(decrypted);
    return JSON.parse(json);
  } catch (err) {
    throw new Error('Invalid password or corrupted data');
  }
}
