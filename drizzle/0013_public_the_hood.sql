ALTER TABLE `activities` MODIFY COLUMN `speakerPhoneOrange` text;--> statement-breakpoint
ALTER TABLE `activities` MODIFY COLUMN `speakerPhoneTelecel` text;--> statement-breakpoint
ALTER TABLE `activities` MODIFY COLUMN `speakerResidence` text;--> statement-breakpoint
ALTER TABLE `commissionMembers` MODIFY COLUMN `phone` text;--> statement-breakpoint
ALTER TABLE `expenses` MODIFY COLUMN `designation` text NOT NULL;--> statement-breakpoint
ALTER TABLE `expenses` MODIFY COLUMN `responsibleName` text;--> statement-breakpoint
ALTER TABLE `louvorMembers` MODIFY COLUMN `phone` text;--> statement-breakpoint
ALTER TABLE `louvorMembers` MODIFY COLUMN `email` text;--> statement-breakpoint
ALTER TABLE `materials` MODIFY COLUMN `custodian` text NOT NULL;--> statement-breakpoint
ALTER TABLE `materials` MODIFY COLUMN `location` text;--> statement-breakpoint
ALTER TABLE `members` MODIFY COLUMN `father` text;--> statement-breakpoint
ALTER TABLE `members` MODIFY COLUMN `mother` text;--> statement-breakpoint
ALTER TABLE `members` MODIFY COLUMN `nationality` text;--> statement-breakpoint
ALTER TABLE `members` MODIFY COLUMN `region` text;--> statement-breakpoint
ALTER TABLE `members` MODIFY COLUMN `residence` text;--> statement-breakpoint
ALTER TABLE `members` MODIFY COLUMN `phoneOrange` text;--> statement-breakpoint
ALTER TABLE `members` MODIFY COLUMN `phoneTelecel` text;--> statement-breakpoint
ALTER TABLE `members` MODIFY COLUMN `email` text;--> statement-breakpoint
ALTER TABLE `otherIncome` MODIFY COLUMN `description` text NOT NULL;--> statement-breakpoint
ALTER TABLE `otherIncome` MODIFY COLUMN `responsibleName` text;--> statement-breakpoint
ALTER TABLE `transfers` MODIFY COLUMN `toChurch` text;