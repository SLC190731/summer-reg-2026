import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL missing");

const UNIT_ID = 7;
const SUBJECT = "people";
const GRADE = 4;

// 待分類項目去除 A/B/C 字母前綴；答案依字母映射到對應文字
const questions = [
  {
    question: "以下哪些事物與內地有關？哪些事物與香港有關？把它們分類。",
    cats: ["與內地有關的事物", "與香港有關的事物"],
    items: [
      "簡體中文字。",
      "繁體中文字。",
      "中華人民共和國護照。",
      "香港特別行政區護照。",
      "港幣。",
      "人民幣。",
    ],
    // A=0,B=1,C=2,D=3,E=4,F=5
    answerIdx: { 0: [0, 2, 5], 1: [1, 3, 4] },
  },
  {
    question: "以下哪些是香港居民享有的權利？哪些是香港居民要遵守的規則？把它們分類。",
    cats: ["享有的權利", "要遵守的規則"],
    items: [
      "參與宗教活動。",
      "在公眾地方保持秩序。",
      "旅行和出入境的自由。",
      "不隨地拋垃圾。",
    ],
    answerIdx: { 0: [0, 2], 1: [1, 3] },
  },
  {
    question: "以下哪些是我們享有的權利？哪些是要遵守的規則？把它們分類。",
    cats: ["享有的權利", "要遵守的規則"],
    items: [
      "到外國探訪親戚。",
      "繳交稅款。",
      "宗教信仰的自由。",
      "遵守交通規則。",
    ],
    answerIdx: { 0: [0, 2], 1: [1, 3] },
  },
  {
    question: "以下哪些是宗教信仰自由的例子？哪些是選擇職業自由的例子？把它們分類。",
    cats: ["宗教信仰自由的例子", "選擇職業自由的例子"],
    items: [
      "何太太信奉天主教，常常到教堂參加宗教活動。",
      "浩文在政府部門工作了五年，然後到銀行工作了。",
      "楊先生在餐廳工作了十多年後決定自行創業。",
      "陳小姐信奉伊斯蘭教，不吃豬肉。",
    ],
    answerIdx: { 0: [0, 3], 1: [1, 2] },
  },
  {
    question: "以下哪些是香港的制度和生活方式？哪些是內地的制度和生活方式？把它們分類。",
    cats: ["香港的制度和生活方式", "內地的制度和生活方式"],
    items: [
      "右上左落，司機在左方。",
      "左上右落，司機在右方。",
      "以港幣作為流通的貨幣。",
      "以人民幣作為流通的貨幣。",
      "用簡體字。",
      "用繁體字。",
    ],
    // 香港 = B、C、F (idx 1,2,5)；內地 = A、D、E (idx 0,3,4)
    answerIdx: { 0: [1, 2, 5], 1: [0, 3, 4] },
  },
  {
    question: "以下哪些是香港的制度和生活方式？哪些是內地的？把它們分類。",
    cats: ["香港的制度和生活方式", "內地的制度和生活方式"],
    items: [
      "常用語言為普通話。",
      "使用簡體字。",
      "常用語言為廣東話。",
      "右上左落，司機在左方。",
      "左上右落，司機在右方。",
    ],
    // 香港 = C、E (idx 2,4)；內地 = A、B、D (idx 0,1,3)
    answerIdx: { 0: [2, 4], 1: [0, 1, 3] },
  },
  {
    question: "以下哪些是香港居民的權利？哪些是香港居民的義務？把它們分類。",
    cats: ["香港居民的權利", "香港居民的義務"],
    items: [
      "旅行和出入境的自由。",
      "保持環境衞生。",
      "宗教信仰的自由。",
      "參與大型活動時遵守秩序。",
      "選擇職業的自由。",
      "遵守出入境條例。",
    ],
    // 權利 = A、C、E (0,2,4)；義務 = B、D、F (1,3,5)
    answerIdx: { 0: [0, 2, 4], 1: [1, 3, 5] },
  },
  {
    question: "以下哪些是香港居民的權利？哪些是香港居民的義務？把它們分類。",
    cats: ["香港居民的權利", "香港居民的義務"],
    items: [
      "遵守交通規則。",
      "進行文化活動的自由。",
      "在觀看大型户外表演時遵守秩序。",
      "繳交稅款。",
      "選擇職業的自由。",
      "使用公共設施和服務。",
    ],
    // 權利 = B、E、F (1,4,5)；義務 = A、C、D (0,2,3)
    answerIdx: { 0: [1, 4, 5], 1: [0, 2, 3] },
  },
];

const conn = await mysql.createConnection(DATABASE_URL);

const [del] = await conn.execute(
  "DELETE FROM classification_questions WHERE unit_id = ?",
  [UNIT_ID]
);
console.log(`已刪除單元七舊資料：${del.affectedRows} 筆`);

for (const q of questions) {
  const categories = q.cats;
  const items = q.items;
  const correctAnswer = {};
  for (const [catIdx, itemIdxs] of Object.entries(q.answerIdx)) {
    const catName = categories[Number(catIdx)];
    correctAnswer[catName] = itemIdxs.map((i) => items[i]);
  }

  await conn.execute(
    `INSERT INTO classification_questions
      (unit_id, question, categories, items, correctAnswer, subject, grade, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      UNIT_ID,
      q.question,
      JSON.stringify(categories),
      JSON.stringify(items),
      JSON.stringify(correctAnswer),
      SUBJECT,
      GRADE,
    ]
  );
  console.log(`✓ 匯入：${q.question.slice(0, 30)}...`);
}

const [rows] = await conn.execute(
  "SELECT COUNT(*) AS cnt FROM classification_questions WHERE unit_id = ?",
  [UNIT_ID]
);
console.log(`✅ 單元七現有分類題總數：${rows[0].cnt}`);
await conn.end();
