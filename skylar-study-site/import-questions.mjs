import { createConnection } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// 解析 DATABASE_URL
const url = new URL(DATABASE_URL);
const config = {
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: {},
};

async function importQuestions() {
  let connection;
  try {
    connection = await createConnection(config);
    
    // 讀取 TSV 檔案
    const filePath = path.join(process.cwd(), 'questions_data.tsv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    
    // 跳過標題行
    const questions = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split('\t');
      if (parts.length < 3) continue;
      
      const content = parts[0];
      const correctAnswer = parseInt(parts[1]);
      const explanation = parts[2];
      
      questions.push({
        content,
        correctAnswer,
        category: 'unit_5',
        difficulty: 'medium',
        explanation,
      });
    }
    
    console.log(`準備匯入 ${questions.length} 道題目...`);
    
    // 批量插入
    for (const question of questions) {
      const sql = `
        INSERT INTO true_or_false_questions 
        (content, correct_answer, category, difficulty, explanation, createdAt, updatedAt) 
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `;
      
      await connection.execute(sql, [
        question.content,
        question.correctAnswer,
        question.category,
        question.difficulty,
        question.explanation,
      ]);
    }
    
    console.log(`✓ 成功匯入 ${questions.length} 道題目！`);
    
  } catch (error) {
    console.error('匯入失敗:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

importQuestions();
