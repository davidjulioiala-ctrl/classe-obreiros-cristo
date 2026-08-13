ALTER TABLE `securityIncidents` ADD `attachmentKey` text;--> statement-breakpoint
ALTER TABLE `securityIncidents` ADD `attachmentUrl` text;--> statement-breakpoint
ALTER TABLE `securityIncidents` ADD `attachmentMimeType` varchar(50);--> statement-breakpoint
ALTER TABLE `securityIncidents` ADD `attachmentSize` int;