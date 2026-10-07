-- Full-text search over published catalogue content (title, tagline,
-- description and tag names). Maintained by the application whenever a
-- product or its tags change; see src/server/catalogue/search-index.ts.
CREATE VIRTUAL TABLE `product_search` USING fts5(
	`product_id` UNINDEXED,
	`title`,
	`body`,
	`tags`,
	tokenize = 'unicode61 remove_diacritics 2'
);
