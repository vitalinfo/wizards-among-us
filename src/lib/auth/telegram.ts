// The verified Telegram identity login works with, whichever way Telegram
// delivered it (today: the OpenID Connect ID token, see telegramOidc.ts).
export type TelegramProfile = {
  id: string; // numeric Telegram id, kept as string (→ identities.provider_user_id)
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  authDate: number; // unix seconds
};
