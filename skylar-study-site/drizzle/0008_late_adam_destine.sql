CREATE TABLE `ordering_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attempt_id` int NOT NULL,
	`question_id` int NOT NULL,
	`userAnswer` text NOT NULL,
	`is_correct` int NOT NULL,
	`time_spent` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `ordering_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unit_id` int NOT NULL,
	`question` text NOT NULL,
	`items` text NOT NULL,
	`correctAnswer` text NOT NULL,
	`subject` varchar(32) DEFAULT 'people',
	`grade` int DEFAULT 4,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `ordering_attempts` ADD CONSTRAINT `ordering_attempts_attempt_id_quiz_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ordering_attempts` ADD CONSTRAINT `ordering_attempts_question_id_ordering_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `ordering_questions`(`id`) ON DELETE cascade ON UPDATE no action;