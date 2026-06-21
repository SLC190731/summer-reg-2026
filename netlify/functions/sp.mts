// ✨ 暑期特選班 排課（日子＋時間）雲端後端（Netlify Database）
// 取代已遺失的後端：讓特選班所選的「日子＋開始時間」能可靠保存與回讀，
// 使點名日曆能完整顯示所有特選班課堂。
// 路徑：GET/POST /.netlify/functions/sp
//   GET                                                      → 回傳 [{ name, gender, grade, total, detail, lesson_count }, ...]
//   POST { name, gender, grade, total, count, detail }       → 新增或更新該學生的特選班排課
//   POST { action: "delete", name }                          → 刪除該學生的特選班紀錄
import { getDatabase } from "@netlify/database";

const db = getDatabase();

export default async (req: Request) => {
  try {
    if (req.method === "GET") {
      const rows = await db.sql`
        SELECT name, gender, grade, total, detail, lesson_count
        FROM sp_records ORDER BY name
      `;
      return Response.json(rows);
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({} as any));
      const name = String(body?.name ?? "").trim();
      if (!name) {
        return Response.json({ error: "name is required" }, { status: 400 });
      }

      if (body?.action === "delete") {
        await db.sql`DELETE FROM sp_records WHERE name = ${name}`;
        return Response.json({ ok: true, deleted: name });
      }

      const gender = String(body?.gender ?? "").trim();
      const grade = String(body?.grade ?? "").trim();
      const total = String(body?.total ?? "0").trim() || "0";
      const detail = String(body?.detail ?? "").trim();
      const lessonCount = Number(body?.count) || 0;
      await db.sql`
        INSERT INTO sp_records (name, gender, grade, total, detail, lesson_count, updated_at)
        VALUES (${name}, ${gender}, ${grade}, ${total}, ${detail}, ${lessonCount}, NOW())
        ON CONFLICT (name) DO UPDATE
          SET gender = EXCLUDED.gender,
              grade = EXCLUDED.grade,
              total = EXCLUDED.total,
              detail = EXCLUDED.detail,
              lesson_count = EXCLUDED.lesson_count,
              updated_at = NOW()
      `;
      return Response.json({ ok: true, name, detail, lesson_count: lessonCount });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (err: any) {
    return Response.json(
      { error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
};
