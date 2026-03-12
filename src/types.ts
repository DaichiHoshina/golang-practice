export interface Tradeoff {
  title: string;
  desc: string;
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
  interviewPoints: string[];
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
