import { useState, useEffect, useCallback } from "hono/jsx/dom";
import type { SyncUser, SyncStatus } from "./sync";
import {
  fetchUser,
  startGithubLogin,
  logout,
  pushSync,
  pullSync,
  API_URL,
} from "./sync";

interface Props {
  /** Called after a successful pull so parent can re-read localStorage */
  onPullComplete: () => void;
}

export function SyncButton({ onPullComplete }: Props) {
  const [user, setUser] = useState<SyncUser | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pullPrompt, setPullPrompt] = useState(false);

  // Don't render if no API URL configured
  if (!API_URL) return null;

  useEffect(() => {
    fetchUser().then((u) => {
      setUser(u);
      // On first login, check if there's remote data to pull
      if (u && !localStorage.getItem("gs_synced_once")) {
        import("./sync").then(({ pullSync: ps }) =>
          ps()
            .then((applied) => {
              if (applied) setPullPrompt(true);
            })
            .catch(() => {}),
        );
      }
    });
  }, []);

  const handleSync = useCallback(async () => {
    if (!user) return;
    setStatus("syncing");
    try {
      await pushSync();
      setStatus("success");
      setLastSync(new Date().toLocaleTimeString("ja-JP"));
    } catch {
      setStatus("error");
    } finally {
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, [user]);

  const handlePull = useCallback(async () => {
    if (!user) return;
    setStatus("syncing");
    try {
      const applied = await pullSync();
      if (applied) {
        setStatus("success");
        setTimeout(() => {
          onPullComplete();
          location.reload();
        }, 600);
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, [user, onPullComplete]);

  const handleLogout = useCallback(async () => {
    await logout();
    setUser(null);
    setDropdownOpen(false);
  }, []);

  if (!user) {
    return (
      <button
        class="btn btn-ghost btn-sm gap-1.5 text-xs"
        onClick={startGithubLogin}
        title="GitHubでログインして進捗を同期"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.744.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.42-1.305.763-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23A11.5 11.5 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.807 5.625-5.479 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12" />
        </svg>
        ログイン
      </button>
    );
  }

  // Pull-applied toast
  if (pullPrompt) {
    return (
      <div class="flex items-center gap-1.5">
        <span class="text-xs text-success font-semibold">
          クラウドから復元しました
        </span>
        <button
          class="btn btn-success btn-xs"
          onClick={() => {
            localStorage.setItem("gs_synced_once", "1");
            setPullPrompt(false);
            location.reload();
          }}
        >
          OK
        </button>
      </div>
    );
  }

  return (
    <div class="relative">
      <button
        class="btn btn-ghost btn-sm gap-1.5 text-xs"
        onClick={() => setDropdownOpen((o) => !o)}
        title="同期メニュー"
      >
        <img src={user.avatar} alt={user.login} class="w-5 h-5 rounded-full" />
        <span class="hidden sm:inline max-w-20 truncate">{user.login}</span>
        {status === "syncing" && (
          <span class="loading loading-spinner loading-xs" />
        )}
        {status === "success" && <span class="text-success text-xs">✓</span>}
        {status === "error" && <span class="text-error text-xs">✗</span>}
      </button>

      {dropdownOpen && (
        <>
          {/* Backdrop */}
          <div
            class="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          {/* Dropdown */}
          <div class="absolute right-0 top-full mt-1 z-50 w-52 bg-base-100 border border-base-300 rounded-lg shadow-xl p-2 space-y-1">
            <div class="px-2 py-1 border-b border-base-200 mb-1">
              <p class="text-xs font-semibold">{user.name}</p>
              <p class="text-xs opacity-60">@{user.login}</p>
              {lastSync && (
                <p class="text-xs opacity-50 mt-0.5">最終同期: {lastSync}</p>
              )}
            </div>
            <button
              class="btn btn-ghost btn-xs w-full justify-start gap-2"
              onClick={() => {
                handleSync();
                setDropdownOpen(false);
              }}
              disabled={status === "syncing"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M8 16H3v5" />
                <path d="M21 3v5h-5" />
              </svg>
              クラウドへ保存
            </button>
            <button
              class="btn btn-ghost btn-xs w-full justify-start gap-2"
              onClick={() => {
                handlePull();
                setDropdownOpen(false);
              }}
              disabled={status === "syncing"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              クラウドから取得
            </button>
            <div class="border-t border-base-200 mt-1 pt-1">
              <button
                class="btn btn-ghost btn-xs w-full justify-start gap-2 text-error"
                onClick={handleLogout}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                ログアウト
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
