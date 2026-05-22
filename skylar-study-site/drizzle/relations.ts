import { relations } from "drizzle-orm/relations";
import { quizAttempts, quizAnswers, trueOrFalseQuestions, users } from "./schema";

export const quizAnswersRelations = relations(quizAnswers, ({one}) => ({
	quizAttempt: one(quizAttempts, {
		fields: [quizAnswers.attemptId],
		references: [quizAttempts.id]
	}),
	trueOrFalseQuestion: one(trueOrFalseQuestions, {
		fields: [quizAnswers.questionId],
		references: [trueOrFalseQuestions.id]
	}),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({one, many}) => ({
	quizAnswers: many(quizAnswers),
	user: one(users, {
		fields: [quizAttempts.userId],
		references: [users.id]
	}),
}));

export const trueOrFalseQuestionsRelations = relations(trueOrFalseQuestions, ({many}) => ({
	quizAnswers: many(quizAnswers),
}));

export const usersRelations = relations(users, ({many}) => ({
	quizAttempts: many(quizAttempts),
}));