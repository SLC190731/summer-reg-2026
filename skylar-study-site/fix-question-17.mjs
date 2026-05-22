import { getDb } from './server/db.ts';
import { eq } from 'drizzle-orm';
import { questions } from './drizzle/schema.ts';

async function fixQuestion() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }

  try {
    // 更新題目 17
    await db
      .update(questions)
      .set({
        content: '宋朝時期，人們為逃避水災從內地遷徙到香港，建立圍村。',
      })
      .where(eq(questions.id, 17));

    console.log('✅ 題目 17 已修正');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixQuestion();
