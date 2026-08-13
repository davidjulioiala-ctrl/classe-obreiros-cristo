CREATE TABLE `louvorMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`instrumentOrVoice` varchar(255) NOT NULL,
	`phone` varchar(30),
	`email` varchar(320),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `louvorMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `louvorScales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activityId` int NOT NULL,
	`louvorMemberId` int NOT NULL,
	`roleInScale` varchar(255) NOT NULL,
	`songs` text,
	`status` enum('escalado','confirmado','realizado','ausente') NOT NULL DEFAULT 'escalado',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `louvorScales_id` PRIMARY KEY(`id`)
);
