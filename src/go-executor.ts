import { API_URL } from "./sync";

// ─── Types ───────────────────────────────────────────────

export interface ExecutionEvent {
  Message: string;
  Kind: "stdout" | "stderr";
  Delay: number;
}

export interface CompileResult {
  Errors: string;
  Events: ExecutionEvent[] | null;
  Status: number;
  IsTest: boolean;
  TestsFailed: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  error: string;
  duration: number;
}

// ─── Default template ────────────────────────────────────

export const DEFAULT_CODE = `package main

import "fmt"

func main() {
\tfmt.Println("Hello, Go!")
}
`;

// ─── Executor ────────────────────────────────────────────

export async function executeGo(
  source: string,
  signal?: AbortSignal,
): Promise<ExecutionResult> {
  const start = performance.now();

  // Determine API endpoint
  const baseUrl = API_URL || "";
  const url = baseUrl ? `${baseUrl}/api/compile` : "/api/compile";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, withVet: true }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Compile API error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as CompileResult;
  const duration = performance.now() - start;

  let stdout = "";
  let stderr = "";

  if (data.Events) {
    for (const ev of data.Events) {
      if (ev.Kind === "stdout") stdout += ev.Message;
      else stderr += ev.Message;
    }
  }

  return {
    stdout,
    stderr,
    error: data.Errors || "",
    duration,
  };
}
