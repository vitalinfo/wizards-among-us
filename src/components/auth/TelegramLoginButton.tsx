"use client";

import { useEffect, useRef } from "react";

// Renders Telegram's Login Widget (their own iframe button). On success Telegram
// redirects the browser to data-auth-url (/auth/telegram), where the server
// verifies the signature and creates the session. The bot's domain must be
// authorized via BotFather /setdomain — the widget will not render on localhost.
export function TelegramLoginButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  useEffect(() => {
    const container = containerRef.current;
    if (!username || !container || container.childElementCount > 0) {
      return;
    }
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", username);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "6");
    script.setAttribute("data-auth-url", "/auth/telegram");
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);
  }, [username]);

  if (!username) {
    return null;
  }
  return <div ref={containerRef} />;
}
