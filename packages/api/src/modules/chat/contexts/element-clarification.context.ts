import { tool, type ToolSet } from "ai";
import { z } from "zod";
import prisma from "@val/db";
import type { ChatContext } from "../chat-context";
import { questionService } from "../../question/question.service";
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

    // Filter questions for this element's category
    const categoryQuestions = project.questions.filter(
      (q) => q.category?.toLowerCase() === element.elementType.toLowerCase(),
    );

    const unansweredQuestions = categoryQuestions.filter((q) => q.answers.length === 0);
    const answeredQuestions = categoryQuestions.filter((q) => q.answers.length > 0);

    const unansweredSection = unansweredQuestions
      .map((q, i) => {
        let entry = `${i + 1}. [ID: ${q.id}] "${q.questionText}"`;
        if (q.whyAsking) entry += `\n   Why we're asking: ${q.whyAsking}`;
        if (q.exampleAnswer) entry += `\n   Example answer: ${q.exampleAnswer}`;
        if (q.isCritical) entry += `\n   ** This is a critical question **`;
        return entry;
      })
      .join("\n\n");

    const answeredSection = answeredQuestions
      .map((q) => {
        const answer = q.answers[0];
        return `- "${q.questionText}" -> "${answer?.answerText || "No answer"}"`;
      })
      .join("\n");

    return `You are Val, an AI startup validation assistant. You are helping a founder clarify the "${label}" aspect of their project through a focused conversation.

Project: "${project.title || "Untitled Project"}"
Brain Dump: ${project.rawBraindump}

Current Element: ${label}
Stated Value: ${element.statedValue || "Not specified"}
Clarity Score: ${element.clarityScore ? Number(element.clarityScore) : 0}/10

${answeredSection ? `Already Answered:\n${answeredSection}\n` : ""}
Questions Still Needing Answers (${unansweredQuestions.length} remaining):
${unansweredSection || "All questions answered!"}

YOUR INSTRUCTIONS:
1. Have a natural, conversational discussion about the "${label}" aspect of their project.
2. Guide the conversation to cover the unanswered questions above, but do NOT just list them. Weave them naturally into the discussion.
3. When the user provides a clear answer to one of the questions, use the submit_answer tool to save it. Extract a concise, standalone answer from their response.
4. You may address multiple questions in a single exchange if the user's response covers several.
5. After saving an answer, briefly acknowledge it and move to the next topic naturally.
6. When all questions for this section are answered, congratulate them and let them know this section is complete.
7. Be concise, warm, and direct. Avoid being overly formal.
8. If the user's answer is vague, ask a follow-up rather than saving an incomplete answer.
9. Do NOT reveal the question IDs to the user. They are for your internal use with the tool only.`;
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
      submit_answer: tool({
        description:
          "Save the user's answer to a clarification question. Call this when the user has provided a clear, substantive answer to one of the unanswered questions. Extract a concise, standalone answer text.",
        inputSchema: z.object({
          questionId: z.string().describe("The ID of the question being answered"),
          answerText: z
            .string()
            .describe("The extracted answer text, written as a concise standalone statement"),
        }),
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

            // Check remaining unanswered count
            const remainingUnanswered = await prisma.question.count({
              where: {
                projectId: element.projectId,
                category: { equals: element.elementType, mode: "insensitive" },
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
