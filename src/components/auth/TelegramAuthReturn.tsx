"use client";

import { useEffect } from "react";

import { authCallbackFromFragment } from "@/lib/auth/telegramLogin";

// Telegram returns to /login with the signed login data in the URL fragment,
// which the server never sees. Forward it to /auth/telegram; `replace` so Back
// does not land on the fragment again.
export function TelegramAuthReturn() {
  useEffect(() => {
    const callback = authCallbackFromFragment(
      window.location.hash,
      window.location.search,
    );
    if (callback) {
      window.location.replace(callback);
    }
  }, []);

  return null;
}
