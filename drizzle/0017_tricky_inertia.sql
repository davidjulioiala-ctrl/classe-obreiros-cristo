ALTER TABLE `users` ADD `twoFactorEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `twoFactorSecret` text;--> statement-breakpoint
ALTER TABLE `users` ADD `twoFactorRecoveryCodes` text;--> statement-breakpoint
ALTER TABLE `users` ADD `twoFactorConfiguredAt` timestamp;