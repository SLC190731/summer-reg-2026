import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getDb,
  listAllUsers,
  updateUserRole,
  getUserById,
  getUserByUsername,
  createLocalUser,
  setUserPassword,
} from "../db";
import { eq } from "drizzle-orm";
import { trueOrFalseQuestions } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";
import { hashPassword } from "../_core/password";

const roleSchema = z.enum(["user", "admin", "teacher"]);

const usernameSchema = z
  .string()
  .trim()
  .min(3, "用戶名需至少 3 字元")
  .max(64)
  .regex(/^[a-zA-Z0-9_.-]+$/, "用戶名只能包含英文、數字、 . _ -");

const passwordSchema = z.string().min(6, "密碼需至少 6 字元").max(128);

export const adminRouter = router({
  /**
   * 更新題目內容（內部維護用）
   */
  updateQuestion: publicProcedure
    .input(z.object({ id: z.number(), content: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(trueOrFalseQuestions)
        .set({ content: input.content })
        .where(eq(trueOrFalseQuestions.id, input.id));

      return { success: true };
    }),

  /** 後台：列出所有用戶與角色（僅 admin） */
  listUsers: adminProcedure.query(async () => {
    const users = await listAllUsers();
    const roleWeight: Record<string, number> = { admin: 0, teacher: 1, user: 2 };
    return [...users].sort((a, b) => {
      const w = (roleWeight[a.role] ?? 9) - (roleWeight[b.role] ?? 9);
      if (w !== 0) return w;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }),

  /** 後台：更新角色 */
  setUserRole: adminProcedure
    .input(z.object({ userId: z.number().int().positive(), role: roleSchema }))
    .mutation(async ({ ctx, input }) => {
      const target = await getUserById(input.userId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "找不到該用戶" });

      if (target.openId === ENV.ownerOpenId && input.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "無法降級網站擁有者" });
      }
      if (ctx.user && target.id === ctx.user.id && input.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "不能將自己降級，請改由其他管理員操作",
        });
      }
      await updateUserRole(input.userId, input.role);
      return { success: true } as const;
    }),

  /** 後台：admin 建立自訂帳號（username + password） */
  createLocalUser: adminProcedure
    .input(
      z.object({
        username: usernameSchema,
        password: passwordSchema,
        name: z.string().trim().max(120).optional(),
        role: roleSchema.default("user"),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await getUserByUsername(input.username);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "用戶名已被使用" });
      }
      const passwordHash = await hashPassword(input.password);
      const created = await createLocalUser({
        username: input.username,
        passwordHash,
        name: input.name?.trim() || input.username,
        role: input.role,
      });
      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "建立帳號失敗" });
      }
      return { success: true, userId: created.id } as const;
    }),

  /** 後台：重設用戶密碼（僅限自訂帳號） */
  resetUserPassword: adminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        password: passwordSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const target = await getUserById(input.userId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "找不到該用戶" });
      if (!target.username) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "該帳號為 OAuth 登入，不能重設密碼",
        });
      }
      const passwordHash = await hashPassword(input.password);
      await setUserPassword(target.id, passwordHash);
      return { success: true } as const;
    }),
});
