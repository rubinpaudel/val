import type { ToolSet } from "ai";
import { stepCountIs, hasToolCall } from "ai";
import prisma from "@val/db";
import type { AgentDefinition } from "../types";
import { elementClarificationSystemPrompt } from "./element-clarification.prompt";
import { createClarificationTools } from "./element-clarification.tools";

const elementTypeLabels: Record<string, string> = {
  who: "Target Audience",
  problem: "Problem",
  solution: "Solution",
  differentiation: "Differentiation",
  monetization: "Monetization",
};

export const elementClarificationAgent: AgentDefinition = {
  skills: ["google-search"],

  async buildSystemPrompt(elementId: string, userId: string): Promise<string> {
    const element = await prisma.projectElement.findUniqueOrThrow({
      where: { id: elementId },
      include: {
        project: {
          include: {
            questions: {
              orderBy: { displayOrder: "asc" },
              include: {
                answers: {
                  where: { isCurrent: true, userId },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const project = element.project;
    const label = elementTypeLabels[element.elementType] ?? element.elementType;

    // Filter questions for this element's category
    const categoryQuestions = project.questions.filter(
      (q) => q.category?.toLowerCase() === element.elementType.toLowerCase(),
    );

    // Split into text and select questions
    const textQuestions = categoryQuestions.filter((q) => q.answerFormat === "text");
    const selectQuestions = categoryQuestions.filter(
      (q) => q.answerFormat === "single_select" || q.answerFormat === "multi_select",
    );

    const unansweredTextQuestions = textQuestions.filter((q) => q.answers.length === 0);
    const answeredQuestions = categoryQuestions.filter((q) => q.answers.length > 0);
    const unansweredSelectQuestions = selectQuestions.filter((q) => q.answers.length === 0);

    const unansweredSection = unansweredTextQuestions
      .map((q, i) => {
        const lines = [`${i + 1}. [ID: ${q.id}] "${q.questionText}"`];
        lines.push(`   Level: ${q.level}`);
        if (q.whyAsking) lines.push(`   Why this matters: ${q.whyAsking}`);
        if (q.exampleAnswer) lines.push(`   Example of a good answer: ${q.exampleAnswer}`);
        if (q.isCritical) lines.push(`   ⚠ CRITICAL — must be answered thoroughly`);
        return lines.join("\n");
      })
      .join("\n\n");

    const unansweredSelectSection = unansweredSelectQuestions
      .map((q, i) => {
        const options = Array.isArray(q.answerOptions) ? (q.answerOptions as string[]) : [];
        const lines = [`${i + 1}. [ID: ${q.id}] "${q.questionText}"`];
        lines.push(`   Type: ${q.answerFormat}`);
        lines.push(`   Suggested options: ${JSON.stringify(options)}`);
        if (q.whyAsking) lines.push(`   Why this matters: ${q.whyAsking}`);
        if (q.isCritical) lines.push(`   ⚠ CRITICAL`);
        return lines.join("\n");
      })
      .join("\n\n");

    const answeredSection = answeredQuestions
      .map((q) => {
        const answer = q.answers[0];
        return `- "${q.questionText}" -> "${answer?.answerText || "No answer"}"`;
      })
      .join("\n");

    return elementClarificationSystemPrompt({
      label,
      title: project.title || "Untitled Project",
      braindump: project.rawBraindump,
      statedValue: element.statedValue || "Not specified",
      clarityScore: element.clarityScore ? Number(element.clarityScore) : 0,
      answeredSection,
      unansweredCount: unansweredTextQuestions.length,
      unansweredSection,
      unansweredSelectCount: unansweredSelectQuestions.length,
      unansweredSelectSection,
    });
  },

  async validateAccess(elementId: string, userId: string): Promise<boolean> {
    const element = await prisma.projectElement.findFirst({
      where: { id: elementId },
      include: { project: { select: { userId: true, deletedAt: true } } },
    });
    if (!element) return false;
    return element.project.userId === userId && element.project.deletedAt === null;
  },

  async generateTitle(_firstMessage: string): Promise<string> {
    return "Clarification Chat";
  },

  async getTools(elementId: string, userId: string): Promise<ToolSet> {
    const element = await prisma.projectElement.findUniqueOrThrow({
      where: { id: elementId },
      select: { projectId: true, elementType: true },
    });

    return createClarificationTools(elementId, userId, element);
  },

  getStopConditions() {
    return [stepCountIs(5), hasToolCall("present_choice")];
  },
};
