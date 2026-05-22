import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, trueOrFalseQuestions, quizAttempts, quizAnswers, classificationQuestions, classificationAttempts, matchingQuestions, matchingAttempts, orderingQuestions, orderingAttempts, choiceQuestions, choiceAttempts } from "../drizzle/schema";
import type { InferInsertModel } from "drizzle-orm";

type InsertUser = InferInsertModel<typeof users>;
type InsertTrueOrFalseQuestion = InferInsertModel<typeof trueOrFalseQuestions>;
type InsertQuizAttempt = InferInsertModel<typeof quizAttempts>;
type InsertQuizAnswer = InferInsertModel<typeof quizAnswers>;
type InsertClassificationQuestion = InferInsertModel<typeof classificationQuestions>;
type InsertClassificationAttempt = InferInsertModel<typeof classificationAttempts>;
type InsertMatchingQuestion = InferInsertModel<typeof matchingQuestions>;
type InsertMatchingAttempt = InferInsertModel<typeof matchingAttempts>;
type InsertOrderingQuestion = InferInsertModel<typeof orderingQuestions>;
type InsertOrderingAttempt = InferInsertModel<typeof orderingAttempts>;
type InsertChoiceQuestion = InferInsertModel<typeof choiceQuestions>;
type InsertChoiceAttempt = InferInsertModel<typeof choiceAttempts>;
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date().toISOString();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date().toISOString();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * 判斷題相關查詢
 */
export async function getAllTrueOrFalseQuestions(category?: string) {
  const db = await getDb();
  if (!db) return [];

  if (category) {
    return db.select().from(trueOrFalseQuestions).where(eq(trueOrFalseQuestions.category, category));
  }
  return db.select().from(trueOrFalseQuestions);
}

export async function getTrueOrFalseQuestionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(trueOrFalseQuestions).where(eq(trueOrFalseQuestions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createTrueOrFalseQuestion(data: InsertTrueOrFalseQuestion) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(trueOrFalseQuestions).values(data);
  return result;
}

export async function createManyTrueOrFalseQuestions(data: InsertTrueOrFalseQuestion[]) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(trueOrFalseQuestions).values(data);
  return result;
}

/**
 * 測驗記錄相關查詢
 */
export async function createQuizAttempt(data: InsertQuizAttempt) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(quizAttempts).values(data);
  
  // 獲取插入的 ID
  // 對於 MySQL，使用 LAST_INSERT_ID() 獲取自動生成的 ID
  if (result && typeof result === 'object' && 'insertId' in result) {
    return { id: (result as any).insertId };
  }
  
  // 如果 insertId 不可用，嘗試查詢最新插入的記錄
  const latestAttempt = await db
    .select({ id: quizAttempts.id })
    .from(quizAttempts)
    .where(eq(quizAttempts.userId, data.userId))
    .orderBy(desc(quizAttempts.completedAt))
    .limit(1);
  
  if (latestAttempt && latestAttempt.length > 0) {
    return { id: latestAttempt[0].id };
  }
  
  return undefined;
}

export async function createQuizAnswer(data: InsertQuizAnswer) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(quizAnswers).values(data);
  return result;
}

export async function createManyQuizAnswers(data: InsertQuizAnswer[]) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(quizAnswers).values(data);
  return result;
}

export async function getQuizAttemptById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(quizAttempts).where(eq(quizAttempts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getQuizAnswersByAttemptId(attemptId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(quizAnswers).where(eq(quizAnswers.attemptId, attemptId));
}

export async function getUserQuizAttempts(userId: number, quizType?: string) {
  const db = await getDb();
  if (!db) return [];

  if (quizType) {
    return db.select().from(quizAttempts).where(
      and(
        eq(quizAttempts.userId, userId),
        eq(quizAttempts.quizType, quizType)
      )
    );
  }
  return db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId));
}


/**
 * 帳號管理（後台用）
 */
export async function listAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users);
}

export type UserRole = "user" | "admin" | "teacher";

export async function updateUserRole(userId: number, role: UserRole) {
  const db = await getDb();
  if (!db) return undefined;
  return db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}


// ============================================================
// 自訂帳號（username + passwordHash）
// ============================================================

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(input: {
  username: string;
  passwordHash: string;
  name?: string | null;
  role?: UserRole;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const openIdStub = `local:${input.username.toLowerCase()}`;
  await db.insert(users).values({
    openId: openIdStub,
    username: input.username,
    passwordHash: input.passwordHash,
    name: input.name ?? input.username,
    loginMethod: "local",
    role: input.role ?? "user",
    lastSignedIn: new Date().toISOString(),
  });
  return getUserByUsername(input.username);
}

export async function setUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function listStudents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, "user"));
}

// ============================================================
// 老師檢視：所有測驗紀錄（含學生資訊）
// ============================================================

export async function listAllQuizAttemptsWithUser() {
  const db = await getDb();
  if (!db) return [];
  // 用 join 把 user 基本資訊帶出
  const rows = await db
    .select({
      attemptId: quizAttempts.id,
      userId: quizAttempts.userId,
      quizType: quizAttempts.quizType,
      category: quizAttempts.category,
      totalQuestions: quizAttempts.totalQuestions,
      correctAnswers: quizAttempts.correctAnswers,
      scorePercentage: quizAttempts.scorePercentage,
      startedAt: quizAttempts.startedAt,
      completedAt: quizAttempts.completedAt,
      userName: users.name,
      username: users.username,
      userRole: users.role,
      userEmail: users.email,
    })
    .from(quizAttempts)
    .innerJoin(users, eq(users.id, quizAttempts.userId))
    .where(eq(users.role, "user"));
  return rows;
}


/**
 * 設定使用者年級（學生第一次登入後選擇）
 */
export async function setUserGrade(userId: number, grade: number) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(users).set({ grade }).where(eq(users.id, userId));
}

// ============================================================
// 分類題相關查詢
// ============================================================

export async function getClassificationQuestionsByUnit(unitId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(classificationQuestions).where(eq(classificationQuestions.unitId, unitId));
}

export async function getClassificationQuestionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(classificationQuestions).where(eq(classificationQuestions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createClassificationQuestion(data: InsertClassificationQuestion) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(classificationQuestions).values(data);
  return result;
}

export async function createManyClassificationQuestions(data: InsertClassificationQuestion[]) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(classificationQuestions).values(data);
  return result;
}

export async function createClassificationAttempt(data: InsertClassificationAttempt) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(classificationAttempts).values(data);
  return result;
}

export async function getClassificationAttemptsByAttemptId(attemptId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(classificationAttempts).where(eq(classificationAttempts.attemptId, attemptId));
}


// ---------- Matching Questions ----------
export async function getMatchingQuestionsByUnit(unitId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchingQuestions).where(eq(matchingQuestions.unitId, unitId));
}

export async function getMatchingQuestionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(matchingQuestions).where(eq(matchingQuestions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMatchingQuestion(data: InsertMatchingQuestion) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(matchingQuestions).values(data);
}

export async function createManyMatchingQuestions(data: InsertMatchingQuestion[]) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(matchingQuestions).values(data);
}

export async function createMatchingAttempt(data: InsertMatchingAttempt) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(matchingAttempts).values(data);
}

export async function getMatchingAttemptsByAttemptId(attemptId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchingAttempts).where(eq(matchingAttempts.attemptId, attemptId));
}

// ---------- Ordering Questions ----------
export async function getOrderingQuestionsByUnit(unitId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderingQuestions).where(eq(orderingQuestions.unitId, unitId));
}

export async function getOrderingQuestionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orderingQuestions).where(eq(orderingQuestions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOrderingQuestion(data: InsertOrderingQuestion) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(orderingQuestions).values(data);
}

export async function createManyOrderingQuestions(data: InsertOrderingQuestion[]) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(orderingQuestions).values(data);
}

export async function createOrderingAttempt(data: InsertOrderingAttempt) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(orderingAttempts).values(data);
}

export async function getOrderingAttemptsByAttemptId(attemptId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderingAttempts).where(eq(orderingAttempts.attemptId, attemptId));
}


// ============================================================
// Choice (multiple choice) questions
// ============================================================

export async function getChoiceQuestionsByUnit(unitId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(choiceQuestions).where(eq(choiceQuestions.unitId, unitId));
}

export async function getChoiceQuestionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(choiceQuestions).where(eq(choiceQuestions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createChoiceQuestion(data: InsertChoiceQuestion) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(choiceQuestions).values(data);
}

export async function createManyChoiceQuestions(data: InsertChoiceQuestion[]) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(choiceQuestions).values(data);
}

export async function createChoiceAttempt(data: InsertChoiceAttempt) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(choiceAttempts).values(data);
}

export async function getChoiceAttemptsByAttemptId(attemptId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(choiceAttempts).where(eq(choiceAttempts.attemptId, attemptId));
}
