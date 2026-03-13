import { useState } from "hono/jsx/dom";

const STORAGE_KEYS = [
  "go-study-completed",
  "go-study-notes",
  "go-study-quiz-scores",
  "go-study-bookmarks",
  "go-study-srs",
  "go-study-log",
] as const;

export function DataManager() {
  const [importStatus, setImportStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const handleExport = () => {
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
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `go-study-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result;
        if (typeof raw !== "string") throw new Error("invalid");
        const data = JSON.parse(raw) as Record<string, unknown>;
        for (const key of STORAGE_KEYS) {
          if (key in data) {
            localStorage.setItem(key, JSON.stringify(data[key]));
          }
        }
        setImportStatus("success");
        setTimeout(() => location.reload(), 800);
      } catch {
        setImportStatus("error");
        setTimeout(() => setImportStatus("idle"), 3000);
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be re-imported
    (e.target as HTMLInputElement).value = "";
  };

  return (
    <div class="card bg-base-200">
      <div class="card-body p-5">
        <span class="text-xs font-semibold mb-1">データ管理</span>
        <p class="text-xs opacity-70 mb-3">
          学習進捗・クイズスコア・メモ・SRSデータをバックアップ/復元できます。
        </p>
        <div class="flex gap-2">
          <button
            class="btn btn-outline btn-sm flex-1 gap-1.5"
            onClick={handleExport}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
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
            エクスポート
          </button>
          <label
            class={`btn btn-sm flex-1 gap-1.5 cursor-pointer ${
              importStatus === "success"
                ? "btn-success"
                : importStatus === "error"
                  ? "btn-error"
                  : "btn-outline"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            {importStatus === "success"
              ? "完了! 再読込中..."
              : importStatus === "error"
                ? "エラー"
                : "インポート"}
            <input
              type="file"
              accept=".json,application/json"
              class="hidden"
              onChange={handleImport}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
