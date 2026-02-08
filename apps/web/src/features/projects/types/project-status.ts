export type ProjectStatus =
  | "draft"
  | "structured"
  | "answered"
  | "researching"
  | "researched"
  | "testing"
  | "validated"
  | "shelved"
  | "killed";

export const statusColors: Record<ProjectStatus, string> = {
  draft: "bg-muted-foreground",
  structured: "bg-blue-500",
  answered: "bg-blue-500",
  researching: "bg-yellow-500 animate-pulse",
  researched: "bg-green-500",
  testing: "bg-yellow-500",
  validated: "bg-green-500",
  shelved: "bg-muted-foreground/50",
  killed: "bg-muted-foreground/50",
};
