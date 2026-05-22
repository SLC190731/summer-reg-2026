import { mysqlTable, mysqlSchema, AnyMySqlColumn, foreignKey, int, timestamp, varchar, text, index, mysqlEnum } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const quizAnswers = mysqlTable("quiz_answers", {
	id: int().autoincrement().notNull(),
	attemptId: int("attempt_id").notNull().references(() => quizAttempts.id, { onDelete: "cascade" } ),
	questionId: int("question_id").notNull().references(() => trueOrFalseQuestions.id, { onDelete: "cascade" } ),
	userAnswer: int("user_answer").notNull(),
	isCorrect: int("is_correct").notNull(),
	timeSpent: int("time_spent"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const quizAttempts = mysqlTable("quiz_attempts", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	quizType: varchar("quiz_type", { length: 50 }).notNull(),
	category: varchar({ length: 255 }),
	totalQuestions: int("total_questions").notNull(),
	correctAnswers: int("correct_answers").notNull(),
	scorePercentage: int("score_percentage").notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	subject: varchar({ length: 32 }),
	grade: int(),
});

export const trueOrFalseQuestions = mysqlTable("true_or_false_questions", {
	id: int().autoincrement().notNull(),
	content: text().notNull(),
	correctAnswer: int("correct_answer").notNull(),
	category: varchar({ length: 255 }),
	difficulty: varchar({ length: 50 }).default('medium'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	explanation: text(),
	subject: varchar({ length: 32 }).default('people'),
	grade: int().default(4),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin','teacher']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	username: varchar({ length: 64 }),
	passwordHash: varchar({ length: 255 }),
	grade: int(),
},
(table) => [
	index("users_openId_unique").on(table.openId),
	index("users_username_unique").on(table.username),
]);

export const classificationQuestions = mysqlTable("classification_questions", {
id: int().autoincrement().notNull(),
unitId: int("unit_id").notNull(),
question: text().notNull(),
categories: text().notNull(),
items: text().notNull(),
correctAnswer: text().notNull(),
subject: varchar({ length: 32 }).default('people'),
grade: int().default(4),
createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const classificationAttempts = mysqlTable("classification_attempts", {
id: int().autoincrement().notNull(),
attemptId: int("attempt_id").notNull().references(() => quizAttempts.id, { onDelete: "cascade" }),
questionId: int("question_id").notNull().references(() => classificationQuestions.id, { onDelete: "cascade" }),
userAnswer: text().notNull(),
isCorrect: int("is_correct").notNull(),
timeSpent: int("time_spent"),
createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const matchingQuestions = mysqlTable("matching_questions", {
id: int().autoincrement().notNull(),
unitId: int("unit_id").notNull(),
question: text().notNull(),
leftItems: text("left_items").notNull(),
rightItems: text("right_items").notNull(),
correctAnswer: text().notNull(),
subject: varchar({ length: 32 }).default('people'),
grade: int().default(4),
createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const matchingAttempts = mysqlTable("matching_attempts", {
id: int().autoincrement().notNull(),
attemptId: int("attempt_id").notNull().references(() => quizAttempts.id, { onDelete: "cascade" }),
questionId: int("question_id").notNull().references(() => matchingQuestions.id, { onDelete: "cascade" }),
userAnswer: text().notNull(),
isCorrect: int("is_correct").notNull(),
timeSpent: int("time_spent"),
createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const orderingQuestions = mysqlTable("ordering_questions", {
id: int().autoincrement().notNull(),
unitId: int("unit_id").notNull(),
question: text().notNull(),
items: text().notNull(),
correctAnswer: text().notNull(),
subject: varchar({ length: 32 }).default('people'),
grade: int().default(4),
createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const orderingAttempts = mysqlTable("ordering_attempts", {
id: int().autoincrement().notNull(),
attemptId: int("attempt_id").notNull().references(() => quizAttempts.id, { onDelete: "cascade" }),
questionId: int("question_id").notNull().references(() => orderingQuestions.id, { onDelete: "cascade" }),
userAnswer: text().notNull(),
isCorrect: int("is_correct").notNull(),
timeSpent: int("time_spent"),
createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const choiceQuestions = mysqlTable("choice_questions", {
id: int().autoincrement().notNull(),
unitId: int("unit_id").notNull(),
question: text().notNull(),
options: text().notNull(),
correctAnswer: text().notNull(),
isMultiple: int("is_multiple").default(0).notNull(),
subject: varchar({ length: 32 }).default('people'),
grade: int().default(4),
createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const choiceAttempts = mysqlTable("choice_attempts", {
id: int().autoincrement().notNull(),
attemptId: int("attempt_id").notNull().references(() => quizAttempts.id, { onDelete: "cascade" }),
questionId: int("question_id").notNull().references(() => choiceQuestions.id, { onDelete: "cascade" }),
userAnswer: text().notNull(),
isCorrect: int("is_correct").notNull(),
timeSpent: int("time_spent"),
createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});
