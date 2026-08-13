CREATE TABLE `memberHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`position` varchar(255) NOT NULL,
	`details` text,
	`startDate` timestamp NOT NULL DEFAULT (now()),
	`endDate` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memberHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `members` ADD `leaderRole` varchar(255);--> statement-breakpoint
ALTER TABLE `members` ADD `louvorRole` varchar(255);