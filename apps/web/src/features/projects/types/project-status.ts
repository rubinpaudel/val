export type ProjectStatus =
  | "DRAFT"
  | "STRUCTURED"
  | "ANSWERED"
  | "RESEARCHING"
  | "RESEARCHED"
  | "TESTING"
  | "VALIDATED"
  | "SHELVED"
  | "KILLED";

export const statusLabels: Record<ProjectStatus, string> = {
  DRAFT: "Draft",
  STRUCTURED: "Structured",
  ANSWERED: "Answered",
  RESEARCHING: "Researching",
  RESEARCHED: "Researched",
  TESTING: "Testing",
  VALIDATED: "Validated",
  SHELVED: "Shelved",
  KILLED: "Killed",
};

export const statusColors: Record<ProjectStatus, string> = {
  DRAFT: "bg-muted-foreground",
  STRUCTURED: "bg-blue-500",
  ANSWERED: "bg-blue-500",
  RESEARCHING: "bg-yellow-500 animate-pulse",
  RESEARCHED: "bg-green-500",
  TESTING: "bg-yellow-500",
  VALIDATED: "bg-green-500",
  SHELVED: "bg-muted-foreground/50",
  KILLED: "bg-muted-foreground/50",
};
