import { router } from "../_core/trpc";
import { teacherProcedure } from "../_core/trpc";
import { listAllQuizAttemptsWithUser } from "../db";

export const teacherRouter = router({
  /** 老師/管理員：取得所有學生測驗紀錄 */
  listAttempts: teacherProcedure.query(async () => {
    const rows = await listAllQuizAttemptsWithUser();
    // 依完成時間倒序
    return [...rows].sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
  }),
});
