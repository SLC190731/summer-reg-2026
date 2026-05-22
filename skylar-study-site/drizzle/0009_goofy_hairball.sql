CREATE TABLE `choice_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attempt_id` int NOT NULL,
	`question_id` int NOT NULL,
	`userAnswer` text NOT NULL,
	`is_correct` int NOT NULL,
	`time_spent` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `choice_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`correctAnswer` text NOT NULL,
	`is_multiple` int NOT NULL DEFAULT 0,
	`subject` varchar(32) DEFAULT 'people',
	`grade` int DEFAULT 4,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `choice_attempts` ADD CONSTRAINT `choice_attempts_attempt_id_quiz_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `choice_attempts` ADD CONSTRAINT `choice_attempts_question_id_choice_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `choice_questions`(`id`) ON DELETE cascade ON UPDATE no action;