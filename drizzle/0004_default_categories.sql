-- Starter categories. The upload form requires a category and the site
-- navigation links to these slugs, but only the local seed created them, so a
-- deployed store had none and nothing could be uploaded. Skipped as soon as
-- any category exists, so categories made by hand are never touched.
INSERT INTO `category` (`id`, `slug`, `name`, `description`, `sort_order`)
SELECT `column1`, `column2`, `column3`, `column4`, `column5` FROM (VALUES
	('cat_full_websites', 'full-websites', 'Full Websites', 'Complete multi-section sites ready to adapt and deploy.', 0),
	('cat_landing_pages', 'landing-pages', 'Landing Pages', 'Focused launch and marketing pages built to convert.', 1),
	('cat_components', 'components', 'Components', 'Reusable interface pieces you can drop into any stack.', 2),
	('cat_sections', 'sections', 'Sections', 'Self-contained page sections: features, pricing, FAQs and more.', 3),
	('cat_backgrounds', 'backgrounds', 'Backgrounds', 'Animated and generative backdrops for heroes and panels.', 4)
)
WHERE NOT EXISTS (SELECT 1 FROM `category`);
