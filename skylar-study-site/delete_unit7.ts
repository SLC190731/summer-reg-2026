import { getDb } from './server/db';
import { matchingQuestions } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }

  console.log('刪除舊的單元七配對題...');
  const result = await db.delete(matchingQuestions).where(eq(matchingQuestions.unitId, 7));
  console.log('刪除完成');
  process.exit(0);
}

main();
