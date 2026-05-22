import { describe, it, expect } from 'vitest';
import { getMatchingQuestionsByUnit } from '../db';

describe('Matching Questions - Unit 5', () => {
  it('should have 9 matching questions for unit 5', async () => {
    const questions = await getMatchingQuestionsByUnit(5);
    expect(questions).toHaveLength(9);
  });

  it('should have correct structure for each question', async () => {
    const questions = await getMatchingQuestionsByUnit(5);
    questions.forEach((q: any) => {
      expect(q).toHaveProperty('id');
      expect(q.unitId).toBe(5);
      expect(q).toHaveProperty('question');
      expect(q).toHaveProperty('leftItems');
      expect(q).toHaveProperty('rightItems');
      expect(q).toHaveProperty('correctAnswer');
      expect(q.subject).toBe('people');
      expect(q.grade).toBe(4);

      const leftItems =
        typeof q.leftItems === 'string' ? JSON.parse(q.leftItems) : q.leftItems;
      const rightItems =
        typeof q.rightItems === 'string' ? JSON.parse(q.rightItems) : q.rightItems;
      const correctAnswer =
        typeof q.correctAnswer === 'string'
          ? JSON.parse(q.correctAnswer)
          : q.correctAnswer;

      expect(Array.isArray(leftItems)).toBe(true);
      expect(leftItems.length).toBeGreaterThan(0);
      expect(Array.isArray(rightItems)).toBe(true);
      expect(rightItems.length).toBeGreaterThan(0);
      expect(typeof correctAnswer).toBe('object');
      expect(correctAnswer).not.toBeNull();
    });
  });

  it('every leftItem should have a corresponding correctAnswer entry with non-empty array', async () => {
    const questions = await getMatchingQuestionsByUnit(5);
    questions.forEach((q: any) => {
      const leftItems = JSON.parse(q.leftItems);
      const correctAnswer = JSON.parse(q.correctAnswer);
      leftItems.forEach((l: string) => {
        expect(correctAnswer).toHaveProperty(l);
        expect(Array.isArray(correctAnswer[l])).toBe(true);
        expect(correctAnswer[l].length).toBeGreaterThan(0);
      });
    });
  });

  it('every value inside correctAnswer must appear in rightItems', async () => {
    const questions = await getMatchingQuestionsByUnit(5);
    questions.forEach((q: any) => {
      const rightItems: string[] = JSON.parse(q.rightItems);
      const correctAnswer: Record<string, string[]> = JSON.parse(q.correctAnswer);
      Object.values(correctAnswer).forEach((arr) => {
        arr.forEach((v) => {
          expect(rightItems).toContain(v);
        });
      });
    });
  });

  it('items should not start with letter or numeric prefixes (A. / 1.)', async () => {
    const questions = await getMatchingQuestionsByUnit(5);
    questions.forEach((q: any) => {
      const left: string[] = JSON.parse(q.leftItems);
      const right: string[] = JSON.parse(q.rightItems);
      [...left, ...right].forEach((s) => {
        expect(/^[A-Za-z]\./.test(s)).toBe(false);
        expect(/^\d+\./.test(s)).toBe(false);
        expect(s.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it('first question should match the expected Xuanzang/Jianzhen/Tang Taizong content', async () => {
    const questions = await getMatchingQuestionsByUnit(5);
    const first = questions.find((q: any) => {
      const left: string[] = JSON.parse(q.leftItems);
      return left.includes('玄奘') && left.includes('鑒真') && left.includes('唐太宗');
    }) as any;
    expect(first).toBeTruthy();
    const correctAnswer = JSON.parse(first.correctAnswer);
    expect(correctAnswer['玄奘']).toContain('使佛教在中國廣泛傳播。');
    expect(correctAnswer['鑒真']).toContain('前往日本，傳揚佛教。');
    expect(correctAnswer['唐太宗']).toContain('使國力強盛，人民生活富足。');
    expect(correctAnswer['唐太宗']).toContain('使鄰近地區歸順。');
  });

  it('should include a one-to-many question where one leftItem maps to multiple rightItems', async () => {
    const questions = await getMatchingQuestionsByUnit(5);
    const hasOneToMany = questions.some((q: any) => {
      const ca: Record<string, string[]> = JSON.parse(q.correctAnswer);
      return Object.values(ca).some((arr) => arr.length > 1);
    });
    expect(hasOneToMany).toBe(true);
  });
});

describe('Matching Questions - Unit 6', () => {
  it('should have 15 matching questions for unit 6', async () => {
    const questions = await getMatchingQuestionsByUnit(6);
    expect(questions).toHaveLength(15);
  });

  it('every question should have valid left/right items and correctAnswer mappings', async () => {
    const questions = await getMatchingQuestionsByUnit(6);
    questions.forEach((q: any) => {
      expect(q.unitId).toBe(6);
      const leftItems: string[] = JSON.parse(q.leftItems);
      const rightItems: string[] = JSON.parse(q.rightItems);
      const correctAnswer: Record<string, string[]> = JSON.parse(q.correctAnswer);
      expect(leftItems.length).toBeGreaterThan(0);
      expect(rightItems.length).toBeGreaterThan(0);
      leftItems.forEach((l) => {
        expect(correctAnswer).toHaveProperty(l);
        expect(correctAnswer[l].length).toBeGreaterThan(0);
        correctAnswer[l].forEach((v) => expect(rightItems).toContain(v));
      });
    });
  });

  it('items should not start with letter or numeric prefixes', async () => {
    const questions = await getMatchingQuestionsByUnit(6);
    questions.forEach((q: any) => {
      const left: string[] = JSON.parse(q.leftItems);
      const right: string[] = JSON.parse(q.rightItems);
      [...left, ...right].forEach((s) => {
        expect(/^[A-Za-z]\./.test(s)).toBe(false);
        expect(/^\d+\./.test(s)).toBe(false);
      });
    });
  });

  it('should include at least one one-to-many question', async () => {
    const questions = await getMatchingQuestionsByUnit(6);
    const hasOneToMany = questions.some((q: any) => {
      const ca: Record<string, string[]> = JSON.parse(q.correctAnswer);
      return Object.values(ca).some((arr) => arr.length > 1);
    });
    expect(hasOneToMany).toBe(true);
  });

  it('should include the Hong Kong name origin question (香江説)', async () => {
    const questions = await getMatchingQuestionsByUnit(6);
    const found = questions.find((q: any) => {
      const left: string[] = JSON.parse(q.leftItems);
      return left.includes('香江説');
    });
    expect(found).toBeTruthy();
  });
});
