ALTER TABLE `quiz_attempts` ADD `subject` varchar(32);--> statement-breakpoint
ALTER TABLE `quiz_attempts` ADD `grade` int;--> statement-breakpoint
ALTER TABLE `true_or_false_questions` ADD `subject` varchar(32) DEFAULT 'people';--> statement-breakpoint
ALTER TABLE `true_or_false_questions` ADD `grade` int DEFAULT 4;--> statement-breakpoint
ALTER TABLE `users` ADD `grade` int;