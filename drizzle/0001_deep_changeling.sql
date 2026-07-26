CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`date` date NOT NULL,
	`startTime` varchar(10),
	`endTime` varchar(10),
	`location` varchar(255),
	`type` varchar(100),
	`audience` varchar(100),
	`hasCommission` boolean NOT NULL DEFAULT false,
	`speakerName` varchar(255),
	`speakerSex` enum('M','F'),
	`speakerPhoneOrange` varchar(20),
	`speakerPhoneTelecel` varchar(20),
	`speakerResidence` varchar(255),
	`theme` varchar(255),
	`biblicalReference` varchar(255),
	`isReligious` boolean NOT NULL DEFAULT true,
	`status` enum('planejada','realizada','cancelada') NOT NULL DEFAULT 'planejada',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activityId` int NOT NULL,
	`memberId` int NOT NULL,
	`isPresent` boolean NOT NULL DEFAULT true,
	`recordedBy` int,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(255) NOT NULL,
	`entityType` varchar(100),
	`entityId` int,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commissionMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activityId` int NOT NULL,
	`memberId` int NOT NULL,
	`role` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commissionMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sequence` int AUTO_INCREMENT NOT NULL,
	`designation` varchar(255) NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`totalPrice` decimal(10,2) NOT NULL,
	`date` date NOT NULL,
	`recordedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`criteria` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`sex` enum('M','F') NOT NULL,
	`birthDate` date,
	`father` varchar(255),
	`mother` varchar(255),
	`nationality` varchar(255),
	`region` varchar(255),
	`residence` varchar(255),
	`phoneOrange` varchar(20),
	`phoneTelecel` varchar(20),
	`email` varchar(320),
	`groupId` int,
	`position` varchar(255),
	`isGuest` boolean NOT NULL DEFAULT false,
	`guestOf` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`isTransferred` boolean NOT NULL DEFAULT false,
	`transferredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `otherIncome` (
	`id` int AUTO_INCREMENT NOT NULL,
	`description` varchar(255) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`date` date NOT NULL,
	`recordedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otherIncome_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`isPaid` boolean NOT NULL DEFAULT false,
	`paidAt` timestamp,
	`paidBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activityId` int NOT NULL,
	`type` enum('ata','relatorio') NOT NULL,
	`content` text,
	`generatedBy` int NOT NULL,
	`downloadedBy` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`fromGroupId` int,
	`toGroupId` int,
	`toChurch` varchar(255),
	`reason` text,
	`status` enum('pendente','aprovada','concluida','cancelada') NOT NULL DEFAULT 'pendente',
	`approvedBy` int,
	`approvedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `churchRole` enum('lider','oficial','louvor','membro') DEFAULT 'membro' NOT NULL;