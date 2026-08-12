"use client";

import { useEffect, useRef } from "react";

// Renders Telegram's Login Widget (their own iframe button). On success Telegram
// redirects the browser to data-auth-url (/auth/telegram), where the server
// verifies the signature and creates the session. The bot's domain must be
// authorized via BotFather /setdomain — the widget will not render on localhost.
//
// botUsername arrives as a PROP, read server-side at request time — deliberately
// not a NEXT_PUBLIC_ env var. Those are inlined into the browser bundle at build
// time, and Heroku pipeline promotion reuses the compiled slug, so a staging
// build promoted to production would ship the staging bot's username.
export function TelegramLoginButton({
  botUsername,
}: {
  botUsername: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!botUsername || !container || container.childElementCount > 0) {
      return;
    }
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "6");
    // Must be ABSOLUTE. Given a relative path the widget silently falls back to
    // callback mode (data-onauth), which we don't define — so authorizing does
    // nothing and the button just flips to its "logged in" state. Built from the
    // live origin so it works on localhost, staging, and prod without config.
    script.setAttribute(
      "data-auth-url",
      new URL("/auth/telegram", window.location.origin).toString(),
    );
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);
  }, [botUsername]);

  if (!botUsername) {
    return null;
  }
  return <div ref={containerRef} />;
}
