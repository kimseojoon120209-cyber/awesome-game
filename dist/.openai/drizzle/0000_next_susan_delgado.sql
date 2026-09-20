CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`coins` integer DEFAULT 450 NOT NULL,
	`owned` text NOT NULL,
	`equipped` text NOT NULL,
	`admin_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`player` text NOT NULL,
	`name` text NOT NULL,
	`level` integer NOT NULL,
	`started` integer NOT NULL,
	`ended` integer,
	`duration` integer,
	`status` text DEFAULT 'playing' NOT NULL,
	`correct` integer DEFAULT 0 NOT NULL,
	`loadout` text NOT NULL,
	`admin` integer DEFAULT 0 NOT NULL
);
