const KEY_HEX = "a7ca9f3366d892c2f0bef417341ca971b69ae9f7bacccffcf43c62d1d7d021f9";
const IV_HEX  = "7475383967656a693334307438397532";

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    hexToBytes(KEY_HEX),
    { name: 'AES-CBC' },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function decryptBytes(cipher: Uint8Array): Promise<Uint8Array> {
  const key = await getKey();
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: hexToBytes(IV_HEX) },
    key,
    cipher,
  );
  return new Uint8Array(plain);
}

export async function encryptBytes(plain: Uint8Array): Promise<Uint8Array> {
  const key = await getKey();
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: hexToBytes(IV_HEX) },
    key,
    plain,
  );
  return new Uint8Array(cipher);
}
