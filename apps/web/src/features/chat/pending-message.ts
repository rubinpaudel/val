let pending: { projectId: string; text: string } | null = null;

export function setPendingMessage(projectId: string, text: string): void {
  pending = { projectId, text };
}

export function consumePendingMessage(projectId: string): string | null {
  if (pending && pending.projectId === projectId) {
    const text = pending.text;
    pending = null;
    return text;
  }
  return null;
}
