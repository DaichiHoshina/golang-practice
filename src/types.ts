export interface Tradeoff {
  title: string;
  desc: string;
}

export interface InterviewPoint {
  point: string;
  detail?: string;
}

export interface Quiz {
  type?: "text" | "concept"; // "text" = text fill-in, "concept" = theory Q&A
  difficulty?: "easy" | "medium" | "hard"; // optional; auto-derived if absent
  code: string; // question text or code with ____
  blanks: string[];
  explanation: string;
  playgroundUrl?: string; // Go Playground link to run the code
}

/** Derive difficulty from quiz when not explicitly set */
export function getQuizDifficulty(q: Quiz): "easy" | "medium" | "hard" {
  if (q.difficulty) return q.difficulty;
  if (q.type === "concept") return "hard";
  return q.blanks.length <= 1 ? "easy" : "medium";
}

export interface Topic {
  id: string;
  section: string;
  title: string;
  tag: string;
  summary: string;
  why: string;
  tradeoffs: Tradeoff[];
  badCode: string;
  goodCode: string;
  interviewPoints: InterviewPoint[];
  quizzes?: Quiz[];
}

export interface Section {
  id: string;
  title: string;
  icon: string;
  description: string;
  topicIds: string[];
}

export interface Recommendation {
  id: string;
  reason: string;
}
