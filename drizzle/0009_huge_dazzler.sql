CREATE TABLE `backupSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hour` int NOT NULL,
	`minute` int NOT NULL DEFAULT 0,
	`destination` enum('local','drive') NOT NULL DEFAULT 'local',
	`cloudEmail` varchar(320),
	`enabled` boolean NOT NULL DEFAULT false,
	`scheduleCronTaskUid` varchar(65),
	`lastRunAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `backupSchedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backupVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`versionLabel` varchar(255) NOT NULL,
	`destination` enum('local','drive') NOT NULL DEFAULT 'local',
	`cloudEmail` varchar(320),
	`storageKey` varchar(500) NOT NULL,
	`fileUrl` text,
	`fileSize` int NOT NULL DEFAULT 0,
	`checksum` varchar(128),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backupVersions_id` PRIMARY KEY(`id`)
);
