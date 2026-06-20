// 暑期特選班（自選課堂）排課資料 API
//
// 為何存在：暑期特選班的上課「日子＋時間」由家長自由揀選，無法像 Part A／Part B
// 那樣由套裝堂數推算回來，因此一定要逐筆保存。外部 Google 試算表無法可靠地寫入
// 該明細，故改以 Netlify Database（我們可完全控制讀寫）作為特選班資料的權威來源。
//
// 端點：/.netlify/functions/sp
//   GET                          -> 回傳所有特選班排課記錄（陣列）
//   POST { name, grade, ... }    -> 以姓名為鍵 upsert 一筆特選班排課
//   POST { action:'delete', name }-> 刪除某學生的特選班排課
import { getDatabase } from "@netlify/database";

const db = getDatabase();

export default async (req) => {
  try {
    if (req.method === "GET") {
      const rows = await db.sql`
        SELECT name, grade, gender, total, lesson_count, detail
        FROM sp_registrations
        ORDER BY name
      `;
      return Response.json(rows);
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const name = String(body.name || "").trim();
      if (!name) {
        return Response.json({ ok: false, error: "缺少學生姓名" }, { status: 400 });
      }

      if (body.action === "delete") {
        await db.sql`DELETE FROM sp_registrations WHERE name = ${name}`;
        return Response.json({ ok: true, deleted: name });
      }

      const grade = String(body.grade || "").trim();
      const gender = String(body.gender || "").trim();
      const total = String(body.total || "0").trim();
      const lessonCount = Number(body.count) || 0;
      const detail = String(body.detail || "").trim();

      await db.sql`
        INSERT INTO sp_registrations (name, grade, gender, total, lesson_count, detail)
        VALUES (${name}, ${grade}, ${gender}, ${total}, ${lessonCount}, ${detail})
        ON CONFLICT (name) DO UPDATE SET
          grade        = EXCLUDED.grade,
          gender       = EXCLUDED.gender,
          total        = EXCLUDED.total,
          lesson_count = EXCLUDED.lesson_count,
          detail       = EXCLUDED.detail,
          created_at   = NOW()
      `;
      return Response.json({ ok: true, name });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (err) {
    return Response.json({ ok: false, error: String(err && err.message || err) }, { status: 500 });
  }
};
