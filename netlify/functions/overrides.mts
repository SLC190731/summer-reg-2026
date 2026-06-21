// 💰 折扣優惠／備註 雲端後端（Netlify Database）
// 取代已遺失的後端：讓行政後台的「折扣優惠」與「備註」欄位能可靠保存與回讀。
// 路徑：GET/POST /.netlify/functions/overrides
//   GET                                  → 回傳 [{ name, discount, remark }, ...]
//   POST { name, discount, remark }      → 新增或更新該學生的折扣與備註
//   POST { action: "delete", name }      → 刪除該學生的折扣／備註紀錄
import { getDatabase } from "@netlify/database";

const db = getDatabase();

export default async (req: Request) => {
  try {
    if (req.method === "GET") {
      const rows = await db.sql`
        SELECT name, discount, remark FROM overrides ORDER BY name
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
        await db.sql`DELETE FROM overrides WHERE name = ${name}`;
        return Response.json({ ok: true, deleted: name });
      }

      const discount = String(body?.discount ?? "0").trim() || "0";
      const remark = String(body?.remark ?? "").trim();
      await db.sql`
        INSERT INTO overrides (name, discount, remark, updated_at)
        VALUES (${name}, ${discount}, ${remark}, NOW())
        ON CONFLICT (name) DO UPDATE
          SET discount = EXCLUDED.discount,
              remark = EXCLUDED.remark,
              updated_at = NOW()
      `;
      return Response.json({ ok: true, name, discount, remark });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (err: any) {
    return Response.json(
      { error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
};
