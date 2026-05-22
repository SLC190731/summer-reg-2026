import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getAllTrueOrFalseQuestions,
  createQuizAttempt,
  createManyQuizAnswers,
  getQuizAttemptById,
  getQuizAnswersByAttemptId,
  getUserQuizAttempts,
  getClassificationQuestionsByUnit,
  getClassificationQuestionById,
  createClassificationAttempt,
  getMatchingQuestionsByUnit,
  getMatchingQuestionById,
  createMatchingAttempt,
  getOrderingQuestionsByUnit,
  getOrderingQuestionById,
  createOrderingAttempt,
  getChoiceQuestionsByUnit,
  getChoiceQuestionById,
  createChoiceAttempt,
} from "../db";
import { TRPCError } from "@trpc/server";

export const quizRouter = router({
  /**
   * 開始測驗 - 獲取隨機打亂的題目
   */
  startQuiz: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const questions = await getAllTrueOrFalseQuestions(input?.category);
      
      // 隨機打亂題目順序
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      
      return shuffled;
    }),

  /**
   * 提交測驗答案並計算成績
   */
  submitQuiz: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        answers: z.array(
          z.object({
            questionId: z.number(),
            userAnswer: z.number().int().min(0).max(1),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const answers = input.answers;

      // 計算成績
      let correctCount = 0;
      const answerDetails: Array<{
        questionId: number;
        userAnswer: number;
        isCorrect: boolean;
      }> = [];

      // 獲取所有題目以驗證答案
      const allQuestions = await getAllTrueOrFalseQuestions(input.category);
      const questionMap = new Map(allQuestions.map(q => [q.id, q]));

      for (const answer of answers) {
        const question = questionMap.get(answer.questionId);
        if (!question) continue;

        const isCorrect = answer.userAnswer === question.correctAnswer;
        if (isCorrect) correctCount++;

        answerDetails.push({
          questionId: answer.questionId,
          userAnswer: answer.userAnswer,
          isCorrect,
        });
      }

      const totalQuestions = answers.length;
      const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

      // 建立測驗記錄
      const attemptResult = await createQuizAttempt({
        userId,
        quizType: "true_or_false",
        category: input.category,
        totalQuestions,
        correctAnswers: correctCount,
        scorePercentage,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      if (!attemptResult) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create quiz attempt",
        });
      }

      // 獲取剛建立的 attempt ID
      const attemptId = (attemptResult as any).insertId || 0;

      // 建立答題記錄
      const quizAnswersData = answerDetails.map(detail => ({
        attemptId,
        questionId: detail.questionId,
        userAnswer: detail.userAnswer,
        isCorrect: detail.isCorrect ? 1 : 0,
        timeSpent: 0,
      }));

      await createManyQuizAnswers(quizAnswersData);

      return {
        attemptId,
        totalQuestions,
        correctAnswers: correctCount,
        scorePercentage,
        answers: answerDetails,
      };
    }),

  /**
   * 獲取測驗結果詳情
   */
  getResult: publicProcedure
    .input(z.object({ attemptId: z.number() }))
    .query(async ({ input }) => {
      const attempt = await getQuizAttemptById(input.attemptId);
      if (!attempt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quiz attempt not found",
        });
      }

      const answers = await getQuizAnswersByAttemptId(input.attemptId);
      
      // 獲取題目詳情
      const allQuestions = await getAllTrueOrFalseQuestions(attempt.category ?? undefined);
      const questionMap = new Map(allQuestions.map(q => [q.id, q]));

      const detailedAnswers = answers.map(answer => ({
        ...answer,
        question: questionMap.get(answer.questionId),
      }));

      return {
        attempt,
        answers: detailedAnswers,
      };
    }),

  /**
   * 獲取用戶的測驗歷史
   */
  getUserHistory: protectedProcedure
    .input(
      z.object({
        quizType: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return getUserQuizAttempts(ctx.user.id, input?.quizType);
    }),

  /**
   * 開始分類題測驗 - 獲取隨機打亂的分類題
   */
  startClassificationQuiz: publicProcedure
    .input(
      z.object({
        unitId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const questions = await getClassificationQuestionsByUnit(input.unitId);
      
      // 隨機打亂題目順序
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      
      return shuffled.map(q => ({
        ...q,
        categories: JSON.parse(q.categories),
        items: JSON.parse(q.items),
        correctAnswer: JSON.parse(q.correctAnswer),
      }));
    }),

  /**
   * 提交分類題答案並計算成績
   */
  submitClassificationQuiz: protectedProcedure
    .input(
      z.object({
        unitId: z.number(),
        answers: z.array(
          z.object({
            questionId: z.number(),
            userAnswer: z.record(z.string(), z.array(z.string())),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const answers = input.answers;

      // 計算成績
      let correctCount = 0;
      const answerDetails: Array<{
        questionId: number;
        userAnswer: Record<string, string[]>;
        isCorrect: boolean;
      }> = [];

      // 獲取所有題目以驗證答案
      for (const answer of answers) {
        const question = await getClassificationQuestionById(answer.questionId);
        if (!question) continue;

        const correctAnswer = JSON.parse(question.correctAnswer);
        
        // 比較答案
        const isCorrect = JSON.stringify(answer.userAnswer) === JSON.stringify(correctAnswer);
        if (isCorrect) correctCount++;

        answerDetails.push({
          questionId: answer.questionId,
          userAnswer: answer.userAnswer,
          isCorrect,
        });
      }

      const totalQuestions = answers.length;
      const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

      // 建立測驗記錄
      const attemptResult = await createQuizAttempt({
        userId,
        quizType: "classification",
        category: `unit_${input.unitId}`,
        totalQuestions,
        correctAnswers: correctCount,
        scorePercentage,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      if (!attemptResult) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create quiz attempt",
        });
      }

      // 獲取剛建立的 attempt ID
      const attemptId = (attemptResult as any)?.id || 0;
      
      if (!attemptId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get attempt ID",
        });
      }

      // 建立分類題答題記錄
      for (const detail of answerDetails) {
        await createClassificationAttempt({
          attemptId,
          questionId: detail.questionId,
          userAnswer: JSON.stringify(detail.userAnswer),
          isCorrect: detail.isCorrect ? 1 : 0,
          timeSpent: 0,
        });
      }

      return {
        attemptId,
        totalQuestions,
        correctAnswers: correctCount,
        scorePercentage,
        answers: answerDetails,
      };
    }),

  /**
   * 開始配對題測驗 - 隨機打亂題目順序
   * 註：左欄 / 右欄随機在前端處理（需同步使用者看到的順序來比對答案）
   */
  startMatchingQuiz: publicProcedure
    .input(
      z.object({
        unitId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const questions = await getMatchingQuestionsByUnit(input.unitId);
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      return shuffled.map((q) => ({
        ...q,
        leftItems: JSON.parse(q.leftItems) as string[],
        rightItems: JSON.parse(q.rightItems) as string[],
        correctAnswer: JSON.parse(q.correctAnswer) as Record<string, string[]>,
      }));
    }),

  /**
   * 提交配對題答案並計算成績
   * userAnswer: Record<leftItem, string[]>  -> 左欄項目對應的右欄選項文本陣列
   */
  submitMatchingQuiz: protectedProcedure
    .input(
      z.object({
        unitId: z.number(),
        answers: z.array(
          z.object({
            questionId: z.number(),
            userAnswer: z.record(z.string(), z.array(z.string())),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const answers = input.answers;

      let correctCount = 0;
      const answerDetails: Array<{
        questionId: number;
        userAnswer: Record<string, string[]>;
        isCorrect: boolean;
      }> = [];

      for (const answer of answers) {
        const question = await getMatchingQuestionById(answer.questionId);
        if (!question) continue;
        const correctAnswer = JSON.parse(question.correctAnswer) as Record<string, string[]>;

        // 比對時排序每個 key 內的陣列，避免順序差異導致誤判
        const normalize = (obj: Record<string, string[]>) => {
          const out: Record<string, string[]> = {};
          for (const k of Object.keys(obj)) {
            out[k] = [...obj[k]].sort();
          }
          return out;
        };
        const sortedKeys = (obj: Record<string, string[]>) =>
          Object.keys(obj).sort().reduce<Record<string, string[]>>((acc, k) => {
            acc[k] = obj[k];
            return acc;
          }, {});
        const a = sortedKeys(normalize(answer.userAnswer));
        const b = sortedKeys(normalize(correctAnswer));
        const isCorrect = JSON.stringify(a) === JSON.stringify(b);
        if (isCorrect) correctCount++;

        answerDetails.push({
          questionId: answer.questionId,
          userAnswer: answer.userAnswer,
          isCorrect,
        });
      }

      const totalQuestions = answers.length;
      const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

      const attemptResult = await createQuizAttempt({
        userId,
        quizType: "matching",
        category: `unit_${input.unitId}`,
        totalQuestions,
        correctAnswers: correctCount,
        scorePercentage,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      if (!attemptResult) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create quiz attempt",
        });
      }
      const attemptId = (attemptResult as any)?.id || 0;
      if (!attemptId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get attempt ID",
        });
      }

      for (const detail of answerDetails) {
        await createMatchingAttempt({
          attemptId,
          questionId: detail.questionId,
          userAnswer: JSON.stringify(detail.userAnswer),
          isCorrect: detail.isCorrect ? 1 : 0,
          timeSpent: 0,
        });
      }

      return {
        attemptId,
        totalQuestions,
        correctAnswers: correctCount,
        scorePercentage,
        answers: answerDetails,
      };
    }),

  /**
   * 開始排序題測驗 - 隨機打亂題目順序
   * 註：每題的 items 隨機在前端處理（保留學生看到的隨機顯示順序）
   */
  startOrderingQuiz: publicProcedure
    .input(
      z.object({
        unitId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const questions = await getOrderingQuestionsByUnit(input.unitId);
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      return shuffled.map((q) => ({
        ...q,
        items: JSON.parse(q.items) as string[],
        correctAnswer: JSON.parse(q.correctAnswer) as string[],
      }));
    }),

  /**
   * 提交排序題答案並計算成績
   * userAnswer: string[] -> 學生排出的純文字順序陣列
   */
  submitOrderingQuiz: protectedProcedure
    .input(
      z.object({
        unitId: z.number(),
        answers: z.array(
          z.object({
            questionId: z.number(),
            userAnswer: z.array(z.string()),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const answers = input.answers;

      let correctCount = 0;
      const answerDetails: Array<{
        questionId: number;
        userAnswer: string[];
        isCorrect: boolean;
      }> = [];

      for (const answer of answers) {
        const question = await getOrderingQuestionById(answer.questionId);
        if (!question) continue;
        const correctAnswer = JSON.parse(question.correctAnswer) as string[];

        // 嚴格按順序逐項比對
        const isCorrect =
          answer.userAnswer.length === correctAnswer.length &&
          answer.userAnswer.every((v, i) => v === correctAnswer[i]);
        if (isCorrect) correctCount++;

        answerDetails.push({
          questionId: answer.questionId,
          userAnswer: answer.userAnswer,
          isCorrect,
        });
      }

      const totalQuestions = answers.length;
      const scorePercentage =
        totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

      const attemptResult = await createQuizAttempt({
        userId,
        quizType: "ordering",
        category: `unit_${input.unitId}`,
        totalQuestions,
        correctAnswers: correctCount,
        scorePercentage,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      if (!attemptResult) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create quiz attempt",
        });
      }
      const attemptId = (attemptResult as any)?.id || 0;
      if (!attemptId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get attempt ID",
        });
      }

      for (const detail of answerDetails) {
        await createOrderingAttempt({
          attemptId,
          questionId: detail.questionId,
          userAnswer: JSON.stringify(detail.userAnswer),
          isCorrect: detail.isCorrect ? 1 : 0,
          timeSpent: 0,
        });
      }

      return {
        attemptId,
        totalQuestions,
        correctAnswers: correctCount,
        scorePercentage,
        answers: answerDetails,
      };
    }),

  /**
   * 開始選擇題測驗 - 隨機打亂題目順序
   * 註：每題的選項在前端隨機洗牌并重新編排 A/B/C/D
   */
  startChoiceQuiz: publicProcedure
    .input(
      z.object({
        unitId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const questions = await getChoiceQuestionsByUnit(input.unitId);
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      return shuffled.map((q) => ({
        ...q,
        options: JSON.parse(q.options) as string[],
        correctAnswer: JSON.parse(q.correctAnswer) as string[],
        isMultiple: (q.isMultiple ?? 0) === 1,
      }));
    }),

  /**
   * 提交選擇題答案並計算成績
   * userAnswer: string[] -> 學生選中的選項內容陣列（純文字）；單選為長度 1、多選為長度 ≥ 1
   */
  submitChoiceQuiz: protectedProcedure
    .input(
      z.object({
        unitId: z.number(),
        answers: z.array(
          z.object({
            questionId: z.number(),
            userAnswer: z.array(z.string()),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const answers = input.answers;

      let correctCount = 0;
      const answerDetails: Array<{
        questionId: number;
        userAnswer: string[];
        isCorrect: boolean;
      }> = [];

      for (const answer of answers) {
        const question = await getChoiceQuestionById(answer.questionId);
        if (!question) continue;
        const correctAnswer = JSON.parse(question.correctAnswer) as string[];

        // 集合比對：排序後 JSON.stringify 深度比對
        const userSorted = [...answer.userAnswer].sort();
        const correctSorted = [...correctAnswer].sort();
        const isCorrect = JSON.stringify(userSorted) === JSON.stringify(correctSorted);
        if (isCorrect) correctCount++;

        answerDetails.push({
          questionId: answer.questionId,
          userAnswer: answer.userAnswer,
          isCorrect,
        });
      }

      const totalQuestions = answers.length;
      const scorePercentage =
        totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

      const attemptResult = await createQuizAttempt({
        userId,
        quizType: "choice",
        category: `unit_${input.unitId}`,
        totalQuestions,
        correctAnswers: correctCount,
        scorePercentage,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      if (!attemptResult) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create quiz attempt",
        });
      }
      const attemptId = (attemptResult as any)?.id || 0;
      if (!attemptId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get attempt ID",
        });
      }

      for (const detail of answerDetails) {
        await createChoiceAttempt({
          attemptId,
          questionId: detail.questionId,
          userAnswer: JSON.stringify(detail.userAnswer),
          isCorrect: detail.isCorrect ? 1 : 0,
          timeSpent: 0,
        });
      }

      return {
        attemptId,
        totalQuestions,
        correctAnswers: correctCount,
        scorePercentage,
        answers: answerDetails,
      };
    }),
});
