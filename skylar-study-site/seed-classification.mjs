import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'study_review',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const classificationQuestions = [
  {
    unitId: 5,
    question: "關於玄奘西行取經的事跡，以下哪些是史書記載的內容？哪些是小説杜撰的內容？把它們分類。",
    categories: ["史書記載的內容", "小説杜撰的內容"],
    items: [
      "主動求取佛經。",
      "成為神仙。",
      "獨自克服困難。",
      "皇帝派遣去取得佛經。",
      "有徒弟陪伴。",
      "回國後傳揚佛法。"
    ],
    correctAnswer: {
      "史書記載的內容": ["主動求取佛經。", "獨自克服困難。", "回國後傳揚佛法。"],
      "小説杜撰的內容": ["成為神仙。", "皇帝派遣去取得佛經。", "有徒弟陪伴。"]
    }
  },
  {
    unitId: 5,
    question: "以下哪些事情是玄奘做的？哪些事情是鑒真做的？把它們分類。",
    categories: ["玄奘做的事情", "鑒真做的事情"],
    items: [
      "推廣唐朝佛寺的建築風格。",
      "把中國的經典翻譯成梵文。",
      "修正經書翻譯本的錯漏。",
      "推廣中國書法藝術。"
    ],
    correctAnswer: {
      "玄奘做的事情": ["把中國的經典翻譯成梵文。", "修正經書翻譯本的錯漏。"],
      "鑒真做的事情": ["推廣唐朝佛寺的建築風格。", "推廣中國書法藝術。"]
    }
  },
  {
    unitId: 5,
    question: "以下哪些是唐朝興盛的情況？哪些是宋朝興盛的情況？把它們分類。",
    categories: ["唐朝興盛的情況", "宋朝興盛的情況"],
    items: [
      "很多外國人到長安進行貿易。",
      "日本派遣使者前來學習知識和文化。",
      "造船技術先進，海外貿易繁盛。",
      "首都汴京一片繁榮的景象。"
    ],
    correctAnswer: {
      "唐朝興盛的情況": ["很多外國人到長安進行貿易。", "日本派遣使者前來學習知識和文化。"],
      "宋朝興盛的情況": ["造船技術先進，海外貿易繁盛。", "首都汴京一片繁榮的景象。"]
    }
  },
  {
    unitId: 5,
    question: "以下哪些是香港在唐朝時期的歷史？哪些是香港在宋朝時期的歷史？把它們分類。",
    categories: ["香港在唐朝時期的歷史", "香港在宋朝時期的歷史"],
    items: [
      "朝廷設置屯門鎮，派士兵屯駐。",
      "人們從內地遷徙到香港，建立圍村。",
      "屯門成為當時海上對外交通的重鎮之一。",
      "皇帝為躲避元兵追殺逃到九龍城。"
    ],
    correctAnswer: {
      "香港在唐朝時期的歷史": ["朝廷設置屯門鎮，派士兵屯駐。", "屯門成為當時海上對外交通的重鎮之一。"],
      "香港在宋朝時期的歷史": ["人們從內地遷徙到香港，建立圍村。", "皇帝為躲避元兵追殺逃到九龍城。"]
    }
  },
  {
    unitId: 5,
    question: "以下哪些是圍村內的設施？哪些不是圍村內的設施？把它們分類。",
    categories: ["圍村內的設施", "不是圍村內的設施"],
    items: [
      "街市。",
      "高牆。",
      "宗祠。",
      "書室。",
      "大型商場。",
      "水井。"
    ],
    correctAnswer: {
      "圍村內的設施": ["高牆。", "宗祠。", "書室。", "水井。"],
      "不是圍村內的設施": ["街市。", "大型商場。"]
    }
  },
  {
    unitId: 5,
    question: "以下哪些是蒙古族的特點？哪些不是蒙古族的特點？把它們分類。",
    categories: ["蒙古族的特點", "不是蒙古族的特點"],
    items: [
      "擅長騎馬和射箭。",
      "沒有固定住所。",
      "住在海上。",
      "性格勇敢、堅毅、刻苦。"
    ],
    correctAnswer: {
      "蒙古族的特點": ["擅長騎馬和射箭。", "沒有固定住所。", "性格勇敢、堅毅、刻苦。"],
      "不是蒙古族的特點": ["住在海上。"]
    }
  },
  {
    unitId: 5,
    question: "以下哪些是對於鐵木真的描述？哪些是對於忽必烈的描述？把它們分類。",
    categories: ["對於鐵木真的描述", "對於忽必烈的描述"],
    items: [
      "被尊稱為「成吉思汗」。",
      "消滅宋朝。",
      "「成吉思汗」的孫兒。",
      "建立元朝。",
      "統一蒙古各部。",
      "建立蒙古政權。"
    ],
    correctAnswer: {
      "對於鐵木真的描述": ["被尊稱為「成吉思汗」。", "統一蒙古各部。", "建立蒙古政權。"],
      "對於忽必烈的描述": ["消滅宋朝。", "「成吉思汗」的孫兒。", "建立元朝。"]
    }
  }
];

async function seed() {
  const connection = await pool.getConnection();
  
  try {
    console.log('開始匯入分類題...');
    
    for (const q of classificationQuestions) {
      const query = `
        INSERT INTO classification_questions 
        (unitId, question, categories, items, correctAnswer, subject, grade, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      
      const values = [
        q.unitId,
        q.question,
        JSON.stringify(q.categories),
        JSON.stringify(q.items),
        JSON.stringify(q.correctAnswer),
        'people',
        4
      ];
      
      await connection.execute(query, values);
      console.log(`✓ 已匯入: ${q.question.substring(0, 50)}...`);
    }
    
    console.log('\n✅ 所有分類題已成功匯入！');
  } catch (error) {
    console.error('❌ 匯入失敗:', error);
    process.exit(1);
  } finally {
    await connection.release();
    await pool.end();
  }
}

seed();
