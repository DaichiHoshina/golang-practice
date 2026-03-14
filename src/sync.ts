// ─── Sync API client ──────────────────────────────────────

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "";

const STORAGE_KEYS = [
  "go-study-completed",
  "go-study-notes",
  "go-study-quiz-scores",
  "go-study-bookmarks",
  "go-study-highlights",
  "go-study-srs",
  "go-study-log",
] as const;

export interface SyncUser {
  id: string;
  login: string;
  name: string;
  avatar: string;
}

export async function fetchUser(): Promise<SyncUser | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/user`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: SyncUser | null };
    return data.user;
  } catch {
    return null;
  }
}

export function startGithubLogin(): void {
  window.location.href = `${API_URL}/api/auth/github`;
}

export async function logout(): Promise<void> {
  if (!API_URL) return;
  await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
}

/** Gather all local study data into one object */
function gatherLocalData(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of STORAGE_KEYS) {
    const val = localStorage.getItem(key);
    if (val) {
      try {
        data[key] = JSON.parse(val);
      } catch {
        data[key] = val;
      }
    }
  }
  return data;
}

/** Write remote data to localStorage (merge: remote wins on conflict) */
function applyRemoteData(remote: Record<string, unknown>): void {
  for (const key of STORAGE_KEYS) {
    if (key in remote) {
      localStorage.setItem(key, JSON.stringify(remote[key]));
    }
  }
}

export type SyncStatus = "idle" | "syncing" | "success" | "error";

/** Push local data to server */
export async function pushSync(): Promise<void> {
  if (!API_URL) throw new Error("API_URL not configured");
  const data = gatherLocalData();
  const res = await fetch(`${API_URL}/api/sync`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
}

/** Pull remote data and apply to localStorage, then reload */
export async function pullSync(): Promise<boolean> {
  if (!API_URL) throw new Error("API_URL not configured");
  const res = await fetch(`${API_URL}/api/sync`, { credentials: "include" });
  if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
  const body = (await res.json()) as {
    data: Record<string, unknown> | null;
    updatedAt: string | null;
  };
  if (!body.data) return false;
  applyRemoteData(body.data);
  return true;
}
