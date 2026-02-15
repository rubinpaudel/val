import prisma from "@val/db";
import type { AgentDefinition } from "../types";
import { projectChatSystemPrompt } from "./project-chat.prompt";

export const projectChatAgent: AgentDefinition = {
  skills: ["google-search"],

  async buildSystemPrompt(projectId: string, _userId: string): Promise<string> {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: {
        elements: { where: { isCurrent: true }, orderBy: { elementType: "asc" } },
        questions: { orderBy: { displayOrder: "asc" } },
        answers: { where: { isCurrent: true } },
      },
    });

    const elementsSummary = project.elements
      .map((el) => {
        const clarity = el.clarityScore ? Number(el.clarityScore) : 0;
        return `- ${el.elementType}: ${el.statedValue || "Not specified"} (clarity: ${clarity}/10)`;
      })
      .join("\n");

    const answeredQuestions = project.questions
      .filter((q) => project.answers.some((a) => a.questionId === q.id))
      .map((q) => {
        const answer = project.answers.find((a) => a.questionId === q.id);
        return `Q: ${q.questionText}\nA: ${answer?.answerText || "No answer"}`;
      })
      .join("\n\n");

    return projectChatSystemPrompt({
      title: project.title || "Untitled Project",
      status: project.status,
      braindump: project.rawBraindump,
      elementsSummary,
      answeredQuestions,
    });
  },

  async validateAccess(projectId: string, userId: string): Promise<boolean> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
      select: { id: true },
    });
    return !!project;
  },

  async generateTitle(firstMessage: string): Promise<string> {
    const maxLength = 50;
    if (firstMessage.length <= maxLength) return firstMessage;
    return firstMessage.slice(0, maxLength) + "...";
  },
};
