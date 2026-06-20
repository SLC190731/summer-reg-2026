-- 暑期特選班（自選課堂）報名記錄
-- 由於外部 Google 試算表無法可靠地保存特選班的「日子＋時間」明細，
-- 改以 Netlify Database 作為特選班排課資料的權威來源，確保能寫入並回讀。
CREATE TABLE IF NOT EXISTS sp_registrations (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  grade        TEXT NOT NULL DEFAULT '',
  gender       TEXT NOT NULL DEFAULT '',
  total        TEXT NOT NULL DEFAULT '0',
  lesson_count INTEGER NOT NULL DEFAULT 0,
  detail       TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMP DEFAULT NOW()
);
