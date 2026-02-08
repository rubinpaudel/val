import { tool, zodSchema, type ToolSet } from "ai";
import { z } from "zod";
import prisma from "@val/db";
import type { ChatContext } from "../chat-context";
import { questionService } from "../../question/question.service";
import { elementClarificationSystemPrompt } from "./element-clarification.prompts";
import { createGoogleSearchTool } from "../tools/google-search.tool";
import { Logger } from "../../../shared/logger";

const logger = new Logger({ service: "element-clarification-context" });

const elementTypeLabels: Record<string, string> = {
  who: "Target Audience",
  problem: "Problem",
  solution: "Solution",
  differentiation: "Differentiation",
  monetization: "Monetization",
};

export const elementClarificationContext: ChatContext = {
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

    // Filter questions for this element's category — only text format (select/scale get dedicated UI)
    const categoryQuestions = project.questions.filter(
      (q) =>
        q.category?.toLowerCase() === element.elementType.toLowerCase() &&
        q.answerFormat === "text",
    );

    const unansweredQuestions = categoryQuestions.filter((q) => q.answers.length === 0);
    const answeredQuestions = categoryQuestions.filter((q) => q.answers.length > 0);

    const unansweredSection = unansweredQuestions
      .map((q, i) => {
        const lines = [`${i + 1}. [ID: ${q.id}] "${q.questionText}"`];
        lines.push(`   Level: ${q.level}`);
        if (q.whyAsking) lines.push(`   Why this matters: ${q.whyAsking}`);
        if (q.exampleAnswer) lines.push(`   Example of a good answer: ${q.exampleAnswer}`);
        if (q.isCritical) lines.push(`   ⚠ CRITICAL — must be answered thoroughly`);
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
      unansweredCount: unansweredQuestions.length,
      unansweredSection,
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

    return {
      google_search: createGoogleSearchTool(),
      submit_answer: tool({
        description:
          "Save the user's answer to a clarification question. Call this when the user has provided a clear, substantive answer to one of the unanswered questions. Extract a concise, standalone answer text.",
        inputSchema: zodSchema(
          z.object({
            questionId: z.string().describe("The ID of the question being answered"),
            answerText: z
              .string()
              .describe("The extracted answer text, written as a concise standalone statement"),
          }),
        ),
        execute: async ({ questionId, answerText }: { questionId: string; answerText: string }) => {
          try {
            // Verify the question belongs to this element's project + category
            const question = await prisma.question.findFirst({
              where: {
                id: questionId,
                projectId: element.projectId,
                category: { equals: element.elementType, mode: "insensitive" },
              },
            });

            if (!question) {
              return {
                success: false,
                error: "Question not found or does not belong to this section",
              };
            }

            const result = await questionService.submitAnswer(userId, {
              questionId,
              answerText,
            });

            logger.info("Answer submitted via clarification chat", {
              questionId,
              answerId: result.id,
              elementId,
            });

            // Check remaining unanswered text questions
            const remainingUnanswered = await prisma.question.count({
              where: {
                projectId: element.projectId,
                category: { equals: element.elementType, mode: "insensitive" },
                answerFormat: "text",
                answers: { none: { isCurrent: true } },
              },
            });

            return {
              success: true,
              answerId: result.id,
              remainingQuestions: remainingUnanswered,
              sectionComplete: remainingUnanswered === 0,
            };
          } catch (err) {
            logger.error(
              "Failed to submit answer via clarification chat",
              err instanceof Error ? err : undefined,
              { questionId },
            );
            return { success: false, error: "Failed to save answer" };
          }
        },
      }),
    };
  },
};
