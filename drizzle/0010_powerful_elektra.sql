ALTER TABLE "applications" ADD COLUMN "child_gender" text;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_child_gender_valid" CHECK (child_gender is null or child_gender in ('boy', 'girl'));
--> statement-breakpoint
-- The FAQ row «Чи побачать волонтери адресу моєї дитини?» is the PUBLIC
-- statement of what a volunteer sees before claiming (CLAUDE.md), and it
-- enumerates the fields — so putting one more on the browse card makes that
-- answer incomplete. The policy copy that lives in code (§2.2, §4.3) moved in
-- the same commit; this row lives in the database, so it moves here.
--
-- Guarded on the seeded text VERBATIM: an admin may have rewritten this answer
-- at /admin/faqs, and an edit a person made deliberately is not ours to
-- overwrite. If this matches nothing, the row has been edited and «стать» has
-- to be added to it by hand — flagged in the PR rather than forced.
UPDATE "faqs"
SET "description" = 'Ні. До того, як Чарівник обере вашу дитину, він бачить лише її ім’я, вік, стать, вашу історію, звідки ви та де живете зараз, і побажання щодо подарунка. Контакти й спосіб передачі відкриваються тільки тому Чарівнику, який узяв саме вашу заявку. Довідку ВПО не бачить жоден волонтер — лише команда проєкту.', "updated_at" = now()
WHERE "description" = 'Ні. До того, як Чарівник обере вашу дитину, він бачить лише її ім’я, вік, вашу історію, звідки ви та де живете зараз, і побажання щодо подарунка. Контакти й спосіб передачі відкриваються тільки тому Чарівнику, який узяв саме вашу заявку. Довідку ВПО не бачить жоден волонтер — лише команда проєкту.';

