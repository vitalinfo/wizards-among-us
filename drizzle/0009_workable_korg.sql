CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"ordinal" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faqs_status_valid" CHECK (status in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE INDEX "faqs_status_ordinal_idx" ON "faqs" USING btree ("status","ordinal","created_at");--> statement-breakpoint
-- Seed the six answers the landing page has been serving from
-- messages/uk.json until now, in the order they were shown. A DATA migration
-- on purpose rather than a line in db/seed.ts: `pnpm db:migrate` is what runs
-- on deploy (Procfile release phase), so this is the only path that reaches
-- production. Guarded by NOT EXISTS so re-running against a database that
-- already has entries adds nothing.
INSERT INTO "faqs" ("title", "description", "status", "ordinal")
SELECT * FROM (VALUES
  ('Хто може подати заявку?', 'Родини з дітьми, які через війну були змушені виїхати з дому, а також родини, що виховують дітей з інвалідністю. Подати заявку можна тоді, коли триває набір на одну з ініціатив.', 'active', 0),
  ('Чи побачать волонтери адресу моєї дитини?', 'Ні. До того, як Чарівник обере вашу дитину, він бачить лише її ім’я, вік, вашу історію, звідки ви та де живете зараз, і побажання щодо подарунка. Контакти й спосіб передачі відкриваються тільки тому Чарівнику, який узяв саме вашу заявку. Довідку ВПО не бачить жоден волонтер — лише команда проєкту.', 'active', 1),
  ('Скільки має коштувати подарунок?', 'Ви самі вказуєте орієнтовну вартість. Ми радимо залишатися в межах розумного — так більше мрій знайдуть свого чарівника.', 'active', 2),
  ('Чи можна змінити заявку після подання?', 'Так, поки її ще не схвалено. Після схвалення заявка закривається для редагування, щоб Чарівник бачив саме ті дані, за якими обрав вашу дитину.', 'active', 3),
  ('Чи потрібно платити за участь?', 'Ні. Ми не збираємо гроші — ні з родин, ні з Чарівників. Проєкт лише знайомить людей одне з одним.', 'active', 4),
  ('Чи потрібно проходити перевірку, щоб стати волонтером?', 'Окремої перевірки немає: щоб стати Чарівником, достатньо увійти через Telegram. Ми завжди бачимо, хто саме взяв заявку, і кожен перегляд даних дитини фіксується в журналі.', 'active', 5)
) AS defaults(title, description, status, ordinal)
WHERE NOT EXISTS (SELECT 1 FROM "faqs");
