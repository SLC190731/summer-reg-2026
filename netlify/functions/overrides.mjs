// 學生折扣優惠／備註 API
//
// 為何存在：導師後台的「折扣優惠」與「備註」需即時編輯並可靠保存。過往這兩項是透過
// 外部 Google 試算表的 update_record 寫入，但該動作會以整行覆寫，導致只送折扣／備註時
// 把已選日子（detailsA／detailsB）一併洗掉，折扣與備註本身亦無法穩定保存。故與暑期
// 特選班排課一樣，改以 Netlify Database 作為這兩項資料的權威來源。
//
// 端點：/.netlify/functions/overrides
//   GET                              -> 回傳所有折扣／備註記錄（陣列）
//   POST { name, discount, remark }  -> 以姓名為鍵 upsert 一筆折扣／備註
//   POST { action:'delete', name }   -> 刪除某學生的折扣／備註
import { getDatabase } from "@netlify/database";

const db = getDatabase();

export default async (req) => {
  try {
    if (req.method === "GET") {
      const rows = await db.sql`
        SELECT name, discount, remark
        FROM student_overrides
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
        await db.sql`DELETE FROM student_overrides WHERE name = ${name}`;
        return Response.json({ ok: true, deleted: name });
      }

      const discount = String(body.discount ?? "0").trim() || "0";
      const remark = String(body.remark ?? "").trim();

      await db.sql`
        INSERT INTO student_overrides (name, discount, remark)
        VALUES (${name}, ${discount}, ${remark})
        ON CONFLICT (name) DO UPDATE SET
          discount   = EXCLUDED.discount,
          remark     = EXCLUDED.remark,
          updated_at = NOW()
      `;
      return Response.json({ ok: true, name });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (err) {
    return Response.json({ ok: false, error: String(err && err.message || err) }, { status: 500 });
  }
};
