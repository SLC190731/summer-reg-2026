import { describe, it, expect } from 'vitest';
import { getChoiceQuestionsByUnit } from '../db';

describe('Choice Questions - Unit 5', () => {
  it('should have 34 choice questions for unit 5', async () => {
    const questions = await getChoiceQuestionsByUnit(5);
    expect(questions).toHaveLength(34);
  });

  it('every question should have valid structure (4 options + correctAnswer subset)', async () => {
    const questions = await getChoiceQuestionsByUnit(5);
    questions.forEach((q: any) => {
      expect(q).toHaveProperty('id');
      expect(q.unitId).toBe(5);
      expect(q).toHaveProperty('question');
      expect(q.subject).toBe('people');
      expect(q.grade).toBe(4);

      const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
      const correctAnswer =
        typeof q.correctAnswer === 'string'
          ? JSON.parse(q.correctAnswer)
          : q.correctAnswer;

      expect(Array.isArray(options)).toBe(true);
      expect(Array.isArray(correctAnswer)).toBe(true);
      expect(options).toHaveLength(4);
      expect(correctAnswer.length).toBeGreaterThanOrEqual(1);
      // 每個正確答案必須在選項中
      correctAnswer.forEach((ans: string) => {
        expect(options).toContain(ans);
      });
    });
  });

  it('should have exactly 7 multiple-choice questions (is_multiple = 1)', async () => {
    const questions = await getChoiceQuestionsByUnit(5);
    const multi = questions.filter((q: any) => q.isMultiple === 1 || q.isMultiple === true);
    expect(multi).toHaveLength(7);
    multi.forEach((q: any) => {
      const correctAnswer = typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer;
      expect(correctAnswer.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('single-choice questions must have exactly one correct answer', async () => {
    const questions = await getChoiceQuestionsByUnit(5);
    const single = questions.filter((q: any) => q.isMultiple === 0 || q.isMultiple === false);
    expect(single).toHaveLength(27);
    single.forEach((q: any) => {
      const correctAnswer = typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer;
      expect(correctAnswer).toHaveLength(1);
    });
  });

  it('options must not start with A./B./C./D. letter prefixes (stored as pure text)', async () => {
    const questions = await getChoiceQuestionsByUnit(5);
    questions.forEach((q: any) => {
      const options: string[] = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
      options.forEach((s) => {
        expect(/^[A-D][\.、]/.test(s)).toBe(false);
        expect(s.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it('should contain the Tang dynasty 不正確 question (Q1) with correct answer 擁有橫跨歐洲', async () => {
    const questions = await getChoiceQuestionsByUnit(5);
    const q1 = questions.find((q: any) =>
      String(q.question).includes('唐朝盛世')
    ) as any;
    expect(q1).toBeTruthy();
    const correctAnswer: string[] = typeof q1.correctAnswer === 'string' ? JSON.parse(q1.correctAnswer) : q1.correctAnswer;
    expect(correctAnswer).toHaveLength(1);
    expect(correctAnswer[0]).toContain('橫跨歐洲和亞洲');
  });

  it('should contain the Mongolia regime founder question with correct answer 鐵木真', async () => {
    const questions = await getChoiceQuestionsByUnit(5);
    const q = questions.find((qq: any) =>
      String(qq.question).includes('蒙古政權')
    ) as any;
    expect(q).toBeTruthy();
    const correctAnswer: string[] = typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer;
    expect(correctAnswer[0]).toContain('鐵木真');
  });

  it('should contain the Yuan founding emperor question with correct answer 忽必烈', async () => {
    const questions = await getChoiceQuestionsByUnit(5);
    const q = questions.find((qq: any) =>
      String(qq.question).includes('元朝的開國皇帝')
    ) as any;
    expect(q).toBeTruthy();
    const correctAnswer: string[] = typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer;
    expect(correctAnswer[0]).toContain('忽必烈');
  });

  it('multi-answer question about 玄奘 contributions should contain 3 correct answers', async () => {
    const questions = await getChoiceQuestionsByUnit(5);
    const q = questions.find((qq: any) =>
      String(qq.question).includes('玄奘為中') && String(qq.question).includes('貢獻')
    ) as any;
    expect(q).toBeTruthy();
    const correctAnswer: string[] = typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer;
    expect(correctAnswer).toHaveLength(3);
  });
});


describe('Choice Questions - Unit 5 關鍵題答案鎖定', () => {
  it('關鍵題答案必須符合 Word 原檔（修正後不可再退回）', async () => {
    const questions = await getChoiceQuestionsByUnit(5);
    const parseAns = (q: any) =>
      typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer;
    const byContains = (text: string) =>
      questions.find((q: any) => q.question.includes(text)) as any;

    // 第 19 題 - 清明上河圖（多選）
    const q19 = byContains('《清明上河圖》');
    expect(q19).toBeDefined();
    expect(new Set(parseAns(q19))).toEqual(
      new Set(['畫中的木橋稱為「虹橋」。', '畫中描繪了宋朝首都汴京及汴河兩岸的景象。'])
    );

    // 第 20 題 - 水密隔艙
    const q20 = byContains('水密隔艙');
    expect(parseAns(q20)).toEqual(['讓船隻不易沉沒。']);

    // 第 23 題 - 宋皇臺
    const q23 = byContains('宋皇臺');
    expect(parseAns(q23)).toEqual(['佛經。']);

    // 第 25 題 - 圍村南遷
    const q25 = byContains('遷徙至香港');
    expect(parseAns(q25)).toEqual(['為了逃避戰火。']);

    // 第 26 題 - 圍村設施
    const q26 = byContains('不是圍村的設施');
    expect(parseAns(q26)).toEqual(['公園。']);

    // 第 27 題 - 宗祠用途（多選）
    const q27 = byContains('宗祠有甚麼用途');
    expect(new Set(parseAns(q27))).toEqual(
      new Set(['供奉祖先。', '讓村民討論重要事情。'])
    );

    // 第 28 題 - 宋朝描述
    const q28 = byContains('對宋朝的描述');
    expect(parseAns(q28)).toEqual(['宋朝距離現代超過兩千年。']);

    // 第 29 題 - 文天祥（多選）
    const q29 = byContains('文天祥');
    expect(new Set(parseAns(q29))).toEqual(
      new Set(['組織義軍，抵抗蒙古入侵。', '拒絕元朝的勸降。'])
    );

    // 第 31 題 - 蒙古政權建立者
    const q31 = byContains('蒙古政權');
    expect(parseAns(q31)).toEqual(['鐵木真。']);

    // 第 33 題 - 元朝開國皇帝
    const q33 = byContains('元朝的開國皇帝');
    expect(parseAns(q33)).toEqual(['忽必烈。']);

    // 第 34 題 - 蒙古族描述
    const q34 = byContains('對於蒙古族的描述');
    expect(parseAns(q34)).toEqual(['蒙古族消滅了唐朝。']);
  });
});
