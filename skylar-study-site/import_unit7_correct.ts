import fs from 'fs';
import { getDb } from './server/db';
import { matchingQuestions } from './drizzle/schema';

const questions = JSON.parse(fs.readFileSync('/home/ubuntu/unit7_matching_correct.json', 'utf-8'));

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }

  console.log('開始匯入正確的單元七配對題...\n');

  let count = 0;
  for (const q of questions) {
    try {
      await db.insert(matchingQuestions).values({
        unitId: 7,
        question: q.question,
        leftItems: JSON.stringify(q.leftItems),
        rightItems: JSON.stringify(q.rightItems),
        correctAnswer: JSON.stringify(q.correctAnswer),
        subject: 'people',
        grade: 4,
      });
      console.log(`✓ 匯入：${q.question}`);
      count++;
    } catch (err) {
      console.error(`✗ 匯入失敗:`, (err as Error).message);
    }
  }

  console.log(`\n匯入完成！共 ${count} 題`);
  process.exit(0);
}

main();
