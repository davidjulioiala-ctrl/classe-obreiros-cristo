CREATE TABLE `materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`condition` enum('Bom','Regular','Precário','Manutenção') NOT NULL DEFAULT 'Bom',
	`custodian` varchar(255) NOT NULL,
	`location` varchar(255),
	`purchaseDate` date,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materials_id` PRIMARY KEY(`id`),
	CONSTRAINT `materials_code_unique` UNIQUE(`code`)
);
