import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { sdk } from "../_core/sdk";
import { getUserByUsername, setUserGrade, getUserById } from "../db";
import { verifyPassword } from "../_core/password";
import { protectedProcedure } from "../_core/trpc";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-zA-Z0-9_.-]+$/);

export const localAuthRouter = router({
  /**
   * 使用「用戶名 + 密碼」登入
   * 成功則發放與 OAuth 共用的 session cookie
   */
  loginWithUsername: publicProcedure
    .input(
      z.object({
        username: usernameSchema,
        password: z.string().min(1).max(128),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await getUserByUsername(input.username);
      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "用戶名或密碼錯誤" });
      }
      const ok = await verifyPassword(input.password, user.passwordHash);
      if (!ok) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "用戶名或密碼錯誤" });
      }
      const sessionToken = await sdk.createSessionToken(user.openId!, {
        name: user.name ?? user.username ?? "",
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      };
    }),

  /**
   * 設定自己的年級（學生首次進站時選擇）
   */
  setMyGrade: protectedProcedure
    .input(z.object({ grade: z.number().int().min(1).max(6) }))
    .mutation(async ({ ctx, input }) => {
      await setUserGrade(ctx.user.id, input.grade);
      const fresh = await getUserById(ctx.user.id);
      return { success: true, grade: fresh?.grade ?? input.grade };
    }),
});
