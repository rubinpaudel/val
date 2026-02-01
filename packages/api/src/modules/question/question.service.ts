import prisma, { type QuestionLevel, IdeaStatus, type Prisma } from "@val/db";
import { NotFoundError } from "../../shared/errors/not-found.error";
import { ValidationError } from "../../shared/errors/validation.error";
import { generateQuestions as aiGenerateQuestions } from "../../services/ai";
import { Logger } from "../../shared/logger";
import type {
  ListQuestionsInput,
  SubmitAnswerInput,
  SkipQuestionInput,
  BulkSubmitAnswersInput,
} from "./question.schema";

const logger = new Logger({ service: "question-service" });

export interface QuestionResponse {
  id: string;
  ideaId: string;
  questionText: string;
  level: QuestionLevel;
  category: string | null;
  whyAsking: string | null;
  exampleAnswer: string | null;
  isCritical: boolean;
  canSkip: boolean;
  answerFormat: string;
  answerOptions: unknown;
  displayOrder: number;
  createdAt: string;
  answer?: AnswerResponse | null;
}

export interface AnswerResponse {
  id: string;
  answerText: string | null;
  answerData: unknown;
  skipped: boolean;
  skipReason?: string | null;
  version: number;
  createdAt: string;
}

export interface QuestionsListResponse {
  questions: QuestionResponse[];
  totalCount: number;
  answeredCount: number;
  skippedCount: number;
}

export const questionService = {
  async generateForIdea(ideaId: string, userId: string): Promise<QuestionsListResponse> {
    const idea = await prisma.idea.findFirst({
      where: { id: ideaId, userId, deletedAt: null },
      include: {
        elements: { where: { isCurrent: true } },
      },
    });

    if (!idea) {
      throw new NotFoundError("Idea", ideaId);
    }

    if (idea.status !== IdeaStatus.STRUCTURED) {
      throw new ValidationError("Questions can only be generated for structured ideas");
    }

    // Delete any existing questions (regeneration scenario)
    await prisma.question.deleteMany({ where: { ideaId } });

    // Call AI service to generate questions
    const generatedQuestions = await aiGenerateQuestions(
      { id: idea.id, rawBraindump: idea.rawBraindump, elements: idea.elements },
      idea.elements
    );

    // Create questions in database
    await prisma.question.createMany({
      data: generatedQuestions.map((q, index) => ({
        ideaId,
        questionText: q.questionText,
        level: q.level,
        category: q.category,
        whyAsking: q.whyAsking,
        exampleAnswer: q.exampleAnswer,
        isCritical: q.isCritical,
        canSkip: q.canSkip,
        answerFormat: q.answerFormat,
        answerOptions: q.answerOptions,
        displayOrder: index,
      })),
    });

    logger.info("Questions generated", { ideaId, count: generatedQuestions.length });

    return this.listForIdea(ideaId, userId, { ideaId, includeAnswered: true });
  },

  async listForIdea(
    ideaId: string,
    userId: string,
    input: ListQuestionsInput
  ): Promise<QuestionsListResponse> {
    const idea = await prisma.idea.findFirst({
      where: { id: ideaId, userId, deletedAt: null },
    });

    if (!idea) {
      throw new NotFoundError("Idea", ideaId);
    }

    const questions = await prisma.question.findMany({
      where: { ideaId },
      orderBy: { displayOrder: "asc" },
      include: {
        answers: {
          where: { isCurrent: true, userId },
          take: 1,
        },
      },
    });

    const formatted: QuestionResponse[] = questions.map((q) => ({
      id: q.id,
      ideaId: q.ideaId,
      questionText: q.questionText,
      level: q.level,
      category: q.category,
      whyAsking: q.whyAsking,
      exampleAnswer: q.exampleAnswer,
      isCritical: q.isCritical,
      canSkip: q.canSkip,
      answerFormat: q.answerFormat,
      answerOptions: q.answerOptions,
      displayOrder: q.displayOrder,
      createdAt: q.createdAt.toISOString(),
      answer: q.answers[0]
        ? {
            id: q.answers[0].id,
            answerText: q.answers[0].answerText,
            answerData: q.answers[0].answerData,
            skipped: false,
            version: q.answers[0].version,
            createdAt: q.answers[0].createdAt.toISOString(),
          }
        : null,
    }));

    const result = input.includeAnswered ? formatted : formatted.filter((q) => !q.answer);

    return {
      questions: result,
      totalCount: questions.length,
      answeredCount: questions.filter((q) => q.answers.length > 0).length,
      skippedCount: 0, // Skipping tracked separately in answerData if needed
    };
  },

  async submitAnswer(userId: string, input: SubmitAnswerInput): Promise<AnswerResponse> {
    const question = await prisma.question.findUnique({
      where: { id: input.questionId },
      include: { idea: true },
    });

    if (!question) {
      throw new NotFoundError("Question", input.questionId);
    }

    if (question.idea.userId !== userId) {
      throw new NotFoundError("Question", input.questionId);
    }

    const existingAnswer = await prisma.answer.findFirst({
      where: { questionId: input.questionId, userId, isCurrent: true },
    });

    const nextVersion = existingAnswer ? existingAnswer.version + 1 : 1;

    if (existingAnswer) {
      await prisma.answer.update({
        where: { id: existingAnswer.id },
        data: { isCurrent: false },
      });
    }

    const answer = await prisma.answer.create({
      data: {
        questionId: input.questionId,
        ideaId: question.ideaId,
        userId,
        answerText: input.answerText ?? null,
        answerData: input.answerData as Prisma.InputJsonValue,
        version: nextVersion,
        isCurrent: true,
      },
    });

    logger.info("Answer submitted", {
      questionId: input.questionId,
      answerId: answer.id,
      version: nextVersion,
    });

    return {
      id: answer.id,
      answerText: answer.answerText,
      answerData: answer.answerData,
      skipped: false,
      version: answer.version,
      createdAt: answer.createdAt.toISOString(),
    };
  },

  async skipQuestion(userId: string, input: SkipQuestionInput): Promise<AnswerResponse> {
    const question = await prisma.question.findUnique({
      where: { id: input.questionId },
      include: { idea: true },
    });

    if (!question) {
      throw new NotFoundError("Question", input.questionId);
    }

    if (question.idea.userId !== userId) {
      throw new NotFoundError("Question", input.questionId);
    }

    if (question.isCritical && !question.canSkip) {
      throw new ValidationError(
        "This question cannot be skipped as it is critical for validation"
      );
    }

    const existingAnswer = await prisma.answer.findFirst({
      where: { questionId: input.questionId, userId, isCurrent: true },
    });

    const nextVersion = existingAnswer ? existingAnswer.version + 1 : 1;

    if (existingAnswer) {
      await prisma.answer.update({
        where: { id: existingAnswer.id },
        data: { isCurrent: false },
      });
    }

    const answer = await prisma.answer.create({
      data: {
        questionId: input.questionId,
        ideaId: question.ideaId,
        userId,
        answerText: null,
        answerData: { skipped: true, skipReason: input.skipReason ?? null },
        version: nextVersion,
        isCurrent: true,
      },
    });

    logger.info("Question skipped", {
      questionId: input.questionId,
      isCritical: question.isCritical,
    });

    return {
      id: answer.id,
      answerText: answer.answerText,
      answerData: answer.answerData,
      skipped: true,
      skipReason: input.skipReason ?? null,
      version: answer.version,
      createdAt: answer.createdAt.toISOString(),
    };
  },

  async bulkSubmitAnswers(
    userId: string,
    input: BulkSubmitAnswersInput
  ): Promise<{ submitted: number; skipped: number }> {
    const idea = await prisma.idea.findFirst({
      where: { id: input.ideaId, userId, deletedAt: null },
    });

    if (!idea) {
      throw new NotFoundError("Idea", input.ideaId);
    }

    let submitted = 0;
    let skipped = 0;

    for (const answerInput of input.answers) {
      if (answerInput.skipped) {
        await this.skipQuestion(userId, {
          questionId: answerInput.questionId,
          skipReason: answerInput.skipReason,
        });
        skipped++;
      } else {
        await this.submitAnswer(userId, {
          questionId: answerInput.questionId,
          answerText: answerInput.answerText,
          answerData: answerInput.answerData,
        });
        submitted++;
      }
    }

    // Check if all questions are answered - update idea status
    const unanswered = await prisma.question.count({
      where: {
        ideaId: input.ideaId,
        answers: { none: { isCurrent: true } },
      },
    });

    if (unanswered === 0) {
      await prisma.idea.update({
        where: { id: input.ideaId },
        data: { status: IdeaStatus.ANSWERED },
      });
      logger.info("All questions answered, idea status updated", { ideaId: input.ideaId });
    }

    return { submitted, skipped };
  },
};
