import { tool, zodSchema, type ToolSet } from "ai";
import { z } from "zod";
import prisma, { ProjectStatus } from "@val/db";
import { Logger } from "../../core/logger";

const logger = new Logger({ service: "element-clarification-tools" });

interface ElementInfo {
  projectId: string;
  elementType: string;
}

export function createClarificationTools(
  elementId: string,
  userId: string,
  element: ElementInfo,
): ToolSet {
  return {
    present_choice: tool({
      description:
        "REQUIRED for any question marked as single_select or multi_select. Renders interactive clickable buttons in the chat UI. You MUST call this tool instead of typing out the options. After calling this tool, STOP and do not generate any more text. The user will respond by clicking a button, and their message will start with 'Selected: '. You may adjust the question text and options to better fit the conversation.",
      inputSchema: zodSchema(
        z.object({
          questionId: z.string().describe("The ID of the question being presented"),
          questionText: z.string().describe("The question to display above the options"),
          options: z.array(z.string()).min(2).describe("The available choices to present"),
          allowMultiple: z
            .boolean()
            .describe("Whether the user can select multiple options (true for multi_select)"),
        }),
      ),
      execute: async ({
        questionId,
        questionText,
        options,
        allowMultiple,
      }: {
        questionId: string;
        questionText: string;
        options: string[];
        allowMultiple: boolean;
      }) => {
        return { questionId, questionText, options, allowMultiple };
      },
    }),
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

          // Inline answer submission (avoids circular dep with questionService)
          const existingAnswer = await prisma.answer.findFirst({
            where: { questionId, userId, isCurrent: true },
          });

          const nextVersion = existingAnswer ? existingAnswer.version + 1 : 1;

          if (existingAnswer) {
            await prisma.answer.update({
              where: { id: existingAnswer.id },
              data: { isCurrent: false },
            });
          }

          const result = await prisma.answer.create({
            data: {
              questionId,
              projectId: element.projectId,
              userId,
              answerText,
              version: nextVersion,
              isCurrent: true,
            },
          });

          logger.info("Answer submitted via clarification chat", {
            questionId,
            answerId: result.id,
            elementId,
          });

          // Check remaining unanswered questions in this category
          const remainingInCategory = await prisma.question.count({
            where: {
              projectId: element.projectId,
              category: { equals: element.elementType, mode: "insensitive" },
              answers: { none: { isCurrent: true } },
            },
          });

          const sectionComplete = remainingInCategory === 0;

          // When a section completes, check if ALL questions across all categories are done
          if (sectionComplete) {
            const remainingInProject = await prisma.question.count({
              where: {
                projectId: element.projectId,
                answers: { none: { isCurrent: true } },
              },
            });

            if (remainingInProject === 0) {
              await prisma.project.update({
                where: { id: element.projectId },
                data: { status: ProjectStatus.answered },
              });
              logger.info("All questions answered via chat, project status updated", {
                projectId: element.projectId,
              });
            }
          }

          return {
            success: true,
            answerId: result.id,
            remainingQuestions: remainingInCategory,
            sectionComplete,
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
}
