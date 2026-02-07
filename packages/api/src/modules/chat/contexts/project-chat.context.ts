import prisma from "@val/db";
import type { ChatContext } from "../chat-context";

export const projectChatContext: ChatContext = {
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

    return `You are Val, an AI startup validation assistant. You are chatting with a founder about their project.

Project: "${project.title || "Untitled Project"}"
Status: ${project.status}

Brain Dump:
${project.rawBraindump}

Extracted Elements:
${elementsSummary}

${answeredQuestions ? `Clarifying Q&A:\n${answeredQuestions}` : ""}

Your role:
- Help the founder think through their project
- Reference the extracted elements and their clarity scores
- Ask clarifying questions when the founder's thinking is vague
- Provide actionable validation advice
- Be conversational, concise, and direct`;
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
