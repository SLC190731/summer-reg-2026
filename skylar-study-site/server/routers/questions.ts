import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getAllTrueOrFalseQuestions,
  getTrueOrFalseQuestionById,
  createTrueOrFalseQuestion,
  createManyTrueOrFalseQuestions,
} from "../db";

export const questionsRouter = router({
  /**
   * 獲取所有判斷題（支援按分類篩選）
   */
  listTrueOrFalse: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const questions = await getAllTrueOrFalseQuestions(input?.category);
      return questions;
    }),

  /**
   * 獲取單個判斷題
   */
  getTrueOrFalseById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getTrueOrFalseQuestionById(input.id);
    }),

  /**
   * 建立單個判斷題（需要認證）
   */
  createTrueOrFalse: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1, "題目內容不能為空"),
        correctAnswer: z.number().int().min(0).max(1),
        category: z.string().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createTrueOrFalseQuestion({
        content: input.content,
        correctAnswer: input.correctAnswer,
        category: input.category,
        difficulty: input.difficulty,
      });
    }),

  /**
   * 批量建立判斷題（需要認證）
   */
  createManyTrueOrFalse: protectedProcedure
    .input(
      z.object({
        questions: z.array(
          z.object({
            content: z.string().min(1),
            correctAnswer: z.number().int().min(0).max(1),
            category: z.string().optional(),
            difficulty: z.enum(["easy", "medium", "hard"]).optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      return createManyTrueOrFalseQuestions(input.questions);
    }),
});
