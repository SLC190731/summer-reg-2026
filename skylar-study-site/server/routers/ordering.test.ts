import { describe, it, expect } from 'vitest';
import { getOrderingQuestionsByUnit } from '../db';

describe('Ordering Questions - Unit 5', () => {
  it('should have 4 ordering questions for unit 5', async () => {
    const questions = await getOrderingQuestionsByUnit(5);
    expect(questions).toHaveLength(4);
  });

  it('every question should have valid structure and matching items/correctAnswer sets', async () => {
    const questions = await getOrderingQuestionsByUnit(5);
    questions.forEach((q: any) => {
      expect(q).toHaveProperty('id');
      expect(q.unitId).toBe(5);
      expect(q).toHaveProperty('question');
      expect(q.subject).toBe('people');
      expect(q.grade).toBe(4);

      const items = typeof q.items === 'string' ? JSON.parse(q.items) : q.items;
      const correctAnswer =
        typeof q.correctAnswer === 'string'
          ? JSON.parse(q.correctAnswer)
          : q.correctAnswer;

      expect(Array.isArray(items)).toBe(true);
      expect(Array.isArray(correctAnswer)).toBe(true);
      expect(items.length).toBeGreaterThanOrEqual(3);
      // items 與 correctAnswer 必須為同一集合（順序不同但內容完全相同）
      expect(items.length).toBe(correctAnswer.length);
      const sortedItems = [...items].sort();
      const sortedAnswer = [...correctAnswer].sort();
      expect(sortedItems).toEqual(sortedAnswer);
    });
  });

  it('items must not start with A./B./1./2. style letter or numeric prefixes', async () => {
    const questions = await getOrderingQuestionsByUnit(5);
    questions.forEach((q: any) => {
      const items: string[] =
        typeof q.items === 'string' ? JSON.parse(q.items) : q.items;
      items.forEach((s) => {
        expect(/^[A-Za-z]\./.test(s)).toBe(false);
        expect(/^\d+\./.test(s)).toBe(false);
        expect(s.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it('should contain the Xuanzang ordering question with correct first/last step', async () => {
    const questions = await getOrderingQuestionsByUnit(5);
    const xuanzang = questions.find((q: any) =>
      String(q.question).includes('玄奘西行取經')
    ) as any;
    expect(xuanzang).toBeTruthy();
    const correctAnswer: string[] = JSON.parse(xuanzang.correctAnswer);
    expect(correctAnswer[0]).toContain('譯文有不少錯漏');
    expect(correctAnswer[correctAnswer.length - 1]).toContain('翻譯成漢文');
  });

  it('should contain the Yuan dynasty ordering question with correct sequence', async () => {
    const questions = await getOrderingQuestionsByUnit(5);
    const yuan = questions.find((q: any) =>
      String(q.question).includes('元朝建立')
    ) as any;
    expect(yuan).toBeTruthy();
    const correctAnswer: string[] = JSON.parse(yuan.correctAnswer);
    expect(correctAnswer[0]).toContain('鐵木真建立蒙古政權');
    expect(correctAnswer[1]).toContain('忽必烈成為領袖');
    expect(correctAnswer[2]).toContain('建立元朝');
    expect(correctAnswer[3]).toContain('將宋朝消滅');
  });

  it('should contain the Wen Tianxiang ordering question with first step as 擔任宋朝丞相', async () => {
    const questions = await getOrderingQuestionsByUnit(5);
    const wen = questions.find((q: any) => String(q.question).includes('文天祥')) as any;
    expect(wen).toBeTruthy();
    const correctAnswer: string[] = JSON.parse(wen.correctAnswer);
    expect(correctAnswer[0]).toContain('擔任宋朝丞相');
    expect(correctAnswer[correctAnswer.length - 1]).toContain('拒絕效忠元朝');
  });
});
