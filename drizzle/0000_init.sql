CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_slug_unique` ON `category` (`slug`);--> statement-breakpoint
CREATE TABLE `download_event` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`product_version_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`product_version_id`) REFERENCES `product_version`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `download_event_version_idx` ON `download_event` (`product_version_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `entitlement` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`scope` text NOT NULL,
	`product_id` text,
	`source` text NOT NULL,
	`order_id` text,
	`revoked_at` integer,
	`revoked_reason` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `entitlement_user_product_idx` ON `entitlement` (`user_id`,`product_id`);--> statement-breakpoint
CREATE INDEX `entitlement_user_scope_idx` ON `entitlement` (`user_id`,`scope`);--> statement-breakpoint
CREATE UNIQUE INDEX `entitlement_order_product_uq` ON `entitlement` (`order_id`,`product_id`) WHERE "entitlement"."order_id" is not null and "entitlement"."scope" = 'product';--> statement-breakpoint
CREATE UNIQUE INDEX `entitlement_order_all_access_uq` ON `entitlement` (`order_id`) WHERE "entitlement"."order_id" is not null and "entitlement"."scope" = 'all_access';--> statement-breakpoint
CREATE UNIQUE INDEX `entitlement_free_uq` ON `entitlement` (`user_id`,`product_id`) WHERE "entitlement"."source" = 'free';--> statement-breakpoint
CREATE TABLE `favourite` (
	`user_id` text NOT NULL,
	`product_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `product_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `favourite_product_idx` ON `favourite` (`product_id`);--> statement-breakpoint
CREATE TABLE `order` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`kind` text NOT NULL,
	`provider` text NOT NULL,
	`provider_session_id` text,
	`provider_payment_id` text,
	`currency` text NOT NULL,
	`total_cents` integer NOT NULL,
	`status_reason` text,
	`paid_at` integer,
	`refunded_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_provider_session_id_unique` ON `order` (`provider_session_id`);--> statement-breakpoint
CREATE INDEX `order_user_idx` ON `order` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `order_status_idx` ON `order` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `order_payment_idx` ON `order` (`provider_payment_id`);--> statement-breakpoint
CREATE TABLE `order_item` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text,
	`kind` text NOT NULL,
	`title_snapshot` text NOT NULL,
	`unit_price_cents` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `order_item_order_idx` ON `order_item` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_item_product_idx` ON `order_item` (`product_id`);--> statement-breakpoint
CREATE TABLE `payment_event` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`type` text NOT NULL,
	`order_id` text,
	`outcome` text NOT NULL,
	`received_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payment_event_order_idx` ON `payment_event` (`order_id`);--> statement-breakpoint
CREATE TABLE `product` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`tagline` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`category_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`price_cents` integer DEFAULT 0 NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`featured_rank` integer DEFAULT 0 NOT NULL,
	`is_demo_content` integer DEFAULT false NOT NULL,
	`licence_type` text DEFAULT 'standard' NOT NULL,
	`licence_summary` text DEFAULT '' NOT NULL,
	`current_version_id` text,
	`published_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_slug_unique` ON `product` (`slug`);--> statement-breakpoint
CREATE INDEX `product_status_published_idx` ON `product` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `product_status_price_idx` ON `product` (`status`,`price_cents`);--> statement-breakpoint
CREATE INDEX `product_category_status_idx` ON `product` (`category_id`,`status`);--> statement-breakpoint
CREATE INDEX `product_featured_idx` ON `product` (`is_featured`,`featured_rank`);--> statement-breakpoint
CREATE TABLE `product_media` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`kind` text NOT NULL,
	`storage_key` text NOT NULL,
	`widths` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`alt` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_media_product_idx` ON `product_media` (`product_id`,`kind`,`sort_order`);--> statement-breakpoint
CREATE TABLE `product_tag` (
	`product_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`product_id`, `tag_id`),
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_tag_tag_idx` ON `product_tag` (`tag_id`);--> statement-breakpoint
CREATE TABLE `product_version` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`version` text NOT NULL,
	`changelog` text DEFAULT '' NOT NULL,
	`prompt` text DEFAULT '' NOT NULL,
	`archive_key` text,
	`archive_file_name` text,
	`archive_size` integer,
	`archive_sha256` text,
	`archive_manifest` text,
	`demo_key` text,
	`dependencies` text DEFAULT '[]' NOT NULL,
	`requirements` text DEFAULT '[]' NOT NULL,
	`technology_notes` text DEFAULT '' NOT NULL,
	`released_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_version_uq` ON `product_version` (`product_id`,`version`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_kind_slug_uq` ON `tag` (`kind`,`slug`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'customer' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_role_idx` ON `user` (`role`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);