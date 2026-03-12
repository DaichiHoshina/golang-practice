export interface Tradeoff {
  title: string;
  desc: string;
}

export interface InterviewPoint {
  point: string;
  detail?: string;
}

export interface Quiz {
  type?: "code" | "concept"; // "code" = fill-in-blank, "concept" = theory Q&A (default: "code")
  code: string; // "code": Go code with ____. "concept": the question text
  blanks: string[]; // "code": answers. "concept": key answer keywords
  explanation: string;
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
