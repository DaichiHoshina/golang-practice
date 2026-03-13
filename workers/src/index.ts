import { signJWT, verifyJWT, getToken, tokenCookie, clearCookie } from "./auth";
import type { JWTPayload } from "./auth";

// ─── Environment bindings ────────────────────────────────

export interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  FRONTEND_URL: string;
}

// ─── Helpers ─────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function getUser(req: Request, env: Env): Promise<JWTPayload | null> {
  const token = getToken(req);
  if (!token) return null;
  return verifyJWT(token, env.JWT_SECRET);
}

// ─── Route handlers ──────────────────────────────────────

async function handleGithubLogin(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const state = crypto.randomUUID();
  const redirect = `https://github.com/login/oauth/authorize?client_id=${
    env.GITHUB_CLIENT_ID
  }&redirect_uri=${encodeURIComponent(
    `${url.origin}/api/auth/callback`,
  )}&scope=read:user&state=${state}`;
  return Response.redirect(redirect, 302);
}

async function handleGithubCallback(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return Response.redirect(`${env.FRONTEND_URL}?error=no_code`, 302);

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/auth/callback`,
    }),
  });
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return Response.redirect(`${env.FRONTEND_URL}?error=token_exchange`, 302);
  }

  // Fetch GitHub user info
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "GoStudyApp/1.0",
    },
  });
  const ghUser = (await userRes.json()) as {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string;
  };

  const userId = String(ghUser.id);

  // Upsert user in D1
  await env.DB.prepare(
    `INSERT INTO users (id, login, name, avatar_url)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET login=excluded.login, name=excluded.name, avatar_url=excluded.avatar_url`,
  )
    .bind(userId, ghUser.login, ghUser.name ?? ghUser.login, ghUser.avatar_url)
    .run();

  // Sign JWT (30 day expiry)
  const payload: JWTPayload = {
    sub: userId,
    login: ghUser.login,
    name: ghUser.name ?? ghUser.login,
    avatar: ghUser.avatar_url,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  };
  const token = await signJWT(payload, env.JWT_SECRET);

  return new Response(null, {
    status: 302,
    headers: {
      Location: env.FRONTEND_URL,
      "Set-Cookie": tokenCookie(token, 60 * 60 * 24 * 30),
    },
  });
}

async function handleGetUser(req: Request, env: Env): Promise<Response> {
  const user = await getUser(req, env);
  if (!user) return json({ user: null });
  return json({
    user: {
      id: user.sub,
      login: user.login,
      name: user.name,
      avatar: user.avatar,
    },
  });
}

async function handleLogout(_req: Request, _env: Env): Promise<Response> {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearCookie(),
    },
  });
}

async function handleGetSync(req: Request, env: Env): Promise<Response> {
  const user = await getUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const row = await env.DB.prepare(
    "SELECT data, updated_at FROM progress WHERE user_id = ?",
  )
    .bind(user.sub)
    .first<{ data: string; updated_at: string }>();

  if (!row) return json({ data: null, updatedAt: null });
  return json({ data: JSON.parse(row.data), updatedAt: row.updated_at });
}

async function handlePutSync(req: Request, env: Env): Promise<Response> {
  const user = await getUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = (await req.json()) as { data: unknown };
  if (!body?.data) return json({ error: "Missing data" }, 400);

  await env.DB.prepare(
    `INSERT INTO progress (user_id, data, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`,
  )
    .bind(user.sub, JSON.stringify(body.data))
    .run();

  return json({ ok: true });
}

// ─── Main fetch handler ──────────────────────────────────

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;
    const origin = req.headers.get("Origin") ?? env.FRONTEND_URL;

    // Preflight CORS
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    let res: Response;

    if (path === "/api/auth/github" && method === "GET") {
      res = await handleGithubLogin(req, env);
    } else if (path === "/api/auth/callback" && method === "GET") {
      res = await handleGithubCallback(req, env);
    } else if (path === "/api/auth/user" && method === "GET") {
      res = await handleGetUser(req, env);
    } else if (path === "/api/auth/logout" && method === "POST") {
      res = await handleLogout(req, env);
    } else if (path === "/api/sync" && method === "GET") {
      res = await handleGetSync(req, env);
    } else if (path === "/api/sync" && method === "PUT") {
      res = await handlePutSync(req, env);
    } else {
      res = json({ error: "Not found" }, 404);
    }

    // Attach CORS headers to all responses
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders(origin))) {
      headers.set(k, v);
    }
    return new Response(res.body, { status: res.status, headers });
  },
};
