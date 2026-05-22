import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('//')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop() || 'study_review',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DATABASE_URL?.includes('ssl') ? { rejectUnauthorized: false } : undefined,
});

async function checkQuestions() {
  try {
    const connection = await pool.getConnection();
    
    // 查詢所有題目
    const [rows] = await connection.execute('SELECT id, content FROM questions ORDER BY id');
    
    console.log(`\n總共 ${rows.length} 道題目\n`);
    
    // 檢查重複
    const contentMap = {};
    const duplicates = [];
    
    rows.forEach((row) => {
      if (contentMap[row.content]) {
        duplicates.push({
          id: row.id,
          content: row.content,
          firstId: contentMap[row.content],
        });
      } else {
        contentMap[row.content] = row.id;
      }
    });
    
    if (duplicates.length > 0) {
      console.log('⚠️  發現重複題目：');
      duplicates.forEach((dup) => {
        console.log(`  題目 ${dup.firstId} 和 ${dup.id} 重複：${dup.content.substring(0, 50)}...`);
      });
    } else {
      console.log('✅ 沒有發現重複題目');
    }
    
    // 檢查題目 17 的錯字
    const [q17] = await connection.execute('SELECT id, content FROM questions WHERE id = 17');
    if (q17.length > 0) {
      console.log(`\n題目 17 內容：${q17[0].content}`);
      if (q17[0].content.includes('遷徲')) {
        console.log('⚠️  發現錯字「遷徲」，應改為「遷徙」');
      }
    }
    
    connection.release();
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkQuestions();
