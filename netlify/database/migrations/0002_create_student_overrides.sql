-- 導師後台為個別學生設定的「折扣優惠」與「文字備註」。
-- 這兩個欄位由後台即時編輯。外部 Google 試算表的 update_record 會以整行覆寫的方式
-- 寫入，若只送出折扣／備註而沒有同時送出已選日子，便會把 detailsA／detailsB 洗掉，
-- 折扣與備註本身亦無法可靠保存。故與暑期特選班排課一樣，改以 Netlify Database 作為
-- 折扣與備註的權威來源，確保能可靠寫入並回讀，且不會影響已記錄的選課日子。
CREATE TABLE IF NOT EXISTS student_overrides (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  discount   TEXT NOT NULL DEFAULT '0',
  remark     TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP DEFAULT NOW()
);
