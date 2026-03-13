// ─── JWT helpers (HMAC-SHA256 via Web Crypto) ────────────

const ENC = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    ENC.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function b64decode(s: string): ArrayBuffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

export interface JWTPayload {
  sub: string; // GitHub user id
  login: string;
  name: string;
  avatar: string;
  exp: number;
}

export async function signJWT(
  payload: JWTPayload,
  secret: string,
): Promise<string> {
  const header = b64url(
    ENC.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  );
  const body = b64url(ENC.encode(JSON.stringify(payload)));
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    ENC.encode(`${header}.${body}`),
  );
  return `${header}.${body}.${b64url(sig)}`;
}

export async function verifyJWT(
  token: string,
  secret: string,
): Promise<JWTPayload | null> {
  try {
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;
    const key = await importKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64decode(sig),
      ENC.encode(`${header}.${body}`),
    );
    if (!valid) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(b64decode(body)),
    ) as JWTPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getToken(request: Request): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)gs_token=([^;]+)/);
  return match ? match[1] : null;
}

export function tokenCookie(token: string, maxAge: number): string {
  return `gs_token=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`;
}

export function clearCookie(): string {
  return "gs_token=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0";
}
