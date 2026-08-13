CREATE TABLE `appSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyName` varchar(100) NOT NULL,
	`keyValue` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `appSettings_keyName_unique` UNIQUE(`keyName`)
);
--> statement-breakpoint
ALTER TABLE `auditLog` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;