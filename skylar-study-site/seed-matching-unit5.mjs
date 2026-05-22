import "dotenv/config";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// 已從用戶提供的 Word 檔提取並經用戶確認的 9 題單元五配對題
// 待分類項目／左項在程式中均去除字母／數字前綴，僅保留文本
const questions = [
  {
    question: "把以下歷史人物與他們的事跡配對。（答案可多於一個。）",
    leftItems: ["玄奘", "鑒真", "唐太宗"],
    rightItems: [
      "使國力強盛，人民生活富足。",
      "使佛教在中國廣泛傳播。",
      "前往日本，傳揚佛教。",
      "使鄰近地區歸順。",
    ],
    correctAnswer: {
      "玄奘": ["使佛教在中國廣泛傳播。"],
      "鑒真": ["前往日本，傳揚佛教。"],
      "唐太宗": ["使國力強盛，人民生活富足。", "使鄰近地區歸順。"],
    },
  },
  {
    question: "把以下圍村的特色與相關的用途配對。（答案可多於一個。）",
    leftItems: ["四周的高牆", "宗祠", "水井", "書室"],
    rightItems: [
      "提供水源。",
      "供奉祖先。",
      "讓村中子弟讀書。",
      "讓村民討論重要事情。",
      "防禦盜賊入侵。",
    ],
    correctAnswer: {
      "四周的高牆": ["防禦盜賊入侵。"],
      "宗祠": ["供奉祖先。", "讓村民討論重要事情。"],
      "水井": ["提供水源。"],
      "書室": ["讓村中子弟讀書。"],
    },
  },
  {
    question: "把以下朝代與當時的歷史人物配對。（答案可多於一個。）",
    leftItems: ["唐朝", "宋朝", "元朝"],
    rightItems: ["玄奘。", "忽必烈。", "唐太宗。", "文天祥。"],
    correctAnswer: {
      "唐朝": ["玄奘。", "唐太宗。"],
      "宋朝": ["文天祥。"],
      "元朝": ["忽必烈。"],
    },
  },
  {
    question: "把以下朝代與相關的事件配對。（答案可多於一個。）",
    leftItems: ["唐朝", "宋朝", "元朝"],
    rightItems: [
      "設置屯門鎮，屯駐士兵，保護商船。",
      "文天祥號召百姓組織義軍。",
      "日本派遣使者到來學習。",
      "玄奘到天竺求取佛經。",
      "皇帝逃亡到九龍城一帶。",
      "忽必烈勸文天祥投降。",
    ],
    correctAnswer: {
      "唐朝": [
        "設置屯門鎮，屯駐士兵，保護商船。",
        "日本派遣使者到來學習。",
        "玄奘到天竺求取佛經。",
      ],
      "宋朝": ["文天祥號召百姓組織義軍。", "皇帝逃亡到九龍城一帶。"],
      "元朝": ["忽必烈勸文天祥投降。"],
    },
  },
  {
    question: "把以下歷史人物與相關的事件配對。",
    leftItems: ["玄奘", "文天祥", "鐵木真", "唐太宗"],
    rightItems: [
      "修正經書譯本的錯漏。",
      "號召百姓組成義軍，對抗蒙古南侵。",
      "建立元朝。",
      "統一蒙古各部落。",
      "被鄰近地區奉為領袖，稱為「天可汗」。",
    ],
    correctAnswer: {
      "玄奘": ["修正經書譯本的錯漏。"],
      "文天祥": ["號召百姓組成義軍，對抗蒙古南侵。"],
      "鐵木真": ["統一蒙古各部落。"],
      "唐太宗": ["被鄰近地區奉為領袖，稱為「天可汗」。"],
    },
  },
  {
    question: "把以下朝代與相關的描述配對。（答案可多於一個。）",
    leftItems: ["唐朝", "宋朝", "元朝"],
    rightItems: [
      "佛教在中國廣泛傳播。",
      "造船技術先進。",
      "軍事疲弱，經常受到侵擾。",
      "首都在長安。",
      "開國皇帝是忽必烈。",
    ],
    correctAnswer: {
      "唐朝": ["佛教在中國廣泛傳播。", "首都在長安。"],
      "宋朝": ["造船技術先進。", "軍事疲弱，經常受到侵擾。"],
      "元朝": ["開國皇帝是忽必烈。"],
    },
  },
  {
    question: "把以下香港的地方與相關的歷史配對。（答案可多於一個。）",
    leftItems: ["九龍城", "屯門", "元朗"],
    rightItems: [
      "唐朝海上對外交通的重鎮之一。",
      "曾經屯駐士兵，保護商船。",
      "宋朝時，人們遷徒到這裏，建立圍村。",
      "宋朝皇帝為躲避追殺到過的地方。",
    ],
    correctAnswer: {
      "九龍城": ["宋朝皇帝為躲避追殺到過的地方。"],
      "屯門": ["唐朝海上對外交通的重鎮之一。", "曾經屯駐士兵，保護商船。"],
      "元朗": ["宋朝時，人們遷徒到這裏，建立圍村。"],
    },
  },
  {
    question: "把以下人物與他們曾經停留的地方配對。",
    leftItems: ["玄奘", "鑒真", "宋朝末代皇帝"],
    rightItems: ["日本。", "九龍城。", "朝鮮半島。", "天竺。"],
    correctAnswer: {
      "玄奘": ["天竺。"],
      "鑒真": ["日本。"],
      "宋朝末代皇帝": ["九龍城。"],
    },
  },
  {
    question: "把以下人物的説話與相關的朝代配對。",
    leftItems: [
      "「我的商船首次採用水密隔艙技術，使海外貿易更安全。」",
      "「我族的軍隊經過艱苦奮戰，消滅了宋朝。」",
      "「鄰近地區歸順朝廷，還把皇上稱為『天可汗』。」",
    ],
    rightItems: ["元朝。", "漢朝。", "唐朝。", "宋朝。"],
    correctAnswer: {
      "「我的商船首次採用水密隔艙技術，使海外貿易更安全。」": ["宋朝。"],
      "「我族的軍隊經過艱苦奮戰，消滅了宋朝。」": ["元朝。"],
      "「鄰近地區歸順朝廷，還把皇上稱為『天可汗』。」": ["唐朝。"],
    },
  },
];

const conn = await mysql.createConnection(url);
try {
  // 清除舊資料避免重複
  await conn.execute("DELETE FROM matching_questions WHERE unit_id = ?", [5]);

  for (const q of questions) {
    await conn.execute(
      `INSERT INTO matching_questions (unit_id, question, left_items, right_items, correctAnswer, subject, grade)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        5,
        q.question,
        JSON.stringify(q.leftItems),
        JSON.stringify(q.rightItems),
        JSON.stringify(q.correctAnswer),
        "people",
        4,
      ]
    );
  }
  const [rows] = await conn.execute(
    "SELECT COUNT(*) AS cnt FROM matching_questions WHERE unit_id = 5"
  );
  console.log("Seeded matching questions for unit 5:", rows[0].cnt);
} finally {
  await conn.end();
}
