import { describe, it, expect } from 'vitest';
import { getClassificationQuestionsByUnit } from '../db';

describe('Classification Questions', () => {
  it('should have 7 classification questions for unit 5', async () => {
    const questions = await getClassificationQuestionsByUnit(5);
    expect(questions).toHaveLength(7);
  });

  it('should have correct structure for each question', async () => {
    const questions = await getClassificationQuestionsByUnit(5);
    
    questions.forEach((q: any) => {
      expect(q).toHaveProperty('id');
      expect(q.unitId).toBe(5);
      expect(q).toHaveProperty('question');
      expect(q).toHaveProperty('categories');
      expect(q).toHaveProperty('items');
      expect(q).toHaveProperty('correctAnswer');
      expect(q).toHaveProperty('subject', 'people');
      expect(q).toHaveProperty('grade', 4);
      
      // 驗證 categories 是 JSON 字符串或陣列
      const categories = typeof q.categories === 'string' ? JSON.parse(q.categories) : q.categories;
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      
      // 驗證 items 是 JSON 字符串或陣列
      const items = typeof q.items === 'string' ? JSON.parse(q.items) : q.items;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      
      // 驗證 correctAnswer 是物件
      const correctAnswer = typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer;
      expect(typeof correctAnswer).toBe('object');
      expect(correctAnswer).not.toBeNull();
    });
  });

  it('should have correct answers matching categories', async () => {
    const questions = await getClassificationQuestionsByUnit(5);
    
    questions.forEach((q: any) => {
      const correctAnswer = typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer;
      const categories = typeof q.categories === 'string' ? JSON.parse(q.categories) : q.categories;
      
      // 每個分類框都應該在 correctAnswer 中有對應的答案
      categories.forEach((cat: string) => {
        expect(correctAnswer).toHaveProperty(cat);
        expect(Array.isArray(correctAnswer[cat])).toBe(true);
      });
    });
  });

  it('should have items without numeric prefixes', async () => {
    const questions = await getClassificationQuestionsByUnit(5);
    
    questions.forEach((q: any) => {
      const items = typeof q.items === 'string' ? JSON.parse(q.items) : q.items;
      items.forEach((item: string) => {
        // 檢查項目不以數字開頭（如 "1.", "2." 等）
        expect(/^\d+\./.test(item)).toBe(false);
        // 檢查項目不為空
        expect(item.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it('should have categories without numeric prefixes', async () => {
    const questions = await getClassificationQuestionsByUnit(5);
    
    questions.forEach((q: any) => {
      const categories = typeof q.categories === 'string' ? JSON.parse(q.categories) : q.categories;
      categories.forEach((cat: string) => {
        // 檢查分類框不以數字開頭
        expect(/^\d+\./.test(cat)).toBe(false);
        // 檢查分類框不為空
        expect(cat.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it('first question should be about Xuanzang', async () => {
    const questions = await getClassificationQuestionsByUnit(5);
    const firstQ = questions[0] as any;
    const categories = typeof firstQ.categories === 'string' ? JSON.parse(firstQ.categories) : firstQ.categories;
    
    expect(firstQ.question).toContain('玄奘');
    expect(categories).toContain('史書記載的內容');
    expect(categories).toContain('小説杜撰的內容');
  });

  it('should have correct answer for first question', async () => {
    const questions = await getClassificationQuestionsByUnit(5);
    const firstQ = questions[0] as any;
    const correctAnswer = typeof firstQ.correctAnswer === 'string' ? JSON.parse(firstQ.correctAnswer) : firstQ.correctAnswer;
    
    // 驗證第一題的答案結構
    expect(correctAnswer['史書記載的內容']).toContain('主動求取佛經。');
    expect(correctAnswer['史書記載的內容']).toContain('獨自克服困難。');
    expect(correctAnswer['史書記載的內容']).toContain('回國後傳揚佛法。');
    
    expect(correctAnswer['小説杜撰的內容']).toContain('成為神仙。');
    expect(correctAnswer['小説杜撰的內容']).toContain('皇帝派遣去取得佛經。');
    expect(correctAnswer['小説杜撰的內容']).toContain('有徒弟陪伴。');
  });
});
