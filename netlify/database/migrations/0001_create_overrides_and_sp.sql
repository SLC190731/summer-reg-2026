-- 💰 折扣優惠／備註：以學生姓名為主鍵，貼附在既有名冊紀錄上
CREATE TABLE IF NOT EXISTS overrides (
  name TEXT PRIMARY KEY,
  discount TEXT NOT NULL DEFAULT '0',
  remark TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ✨ 暑期特選班 排課（日子＋時間）：以學生姓名為主鍵，可靠保存與回讀
CREATE TABLE IF NOT EXISTS sp_records (
  name TEXT PRIMARY KEY,
  gender TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  total TEXT NOT NULL DEFAULT '0',
  detail TEXT NOT NULL DEFAULT '',
  lesson_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
