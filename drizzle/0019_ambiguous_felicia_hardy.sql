CREATE TABLE `activityDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activityId` int NOT NULL,
	`type` enum('ata','relatorio') NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(1000) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`sizeBytes` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activities` ADD `meetingAgenda` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `meetingReason` text;