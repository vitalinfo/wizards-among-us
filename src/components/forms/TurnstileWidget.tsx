"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile. Renders their widget and drops the resulting token into
// a hidden input, so it submits with the surrounding form and the server can
// verify it.
//
// The sitekey arrives as a PROP, read server-side per request — deliberately
// not a NEXT_PUBLIC_ var, because those are inlined at build time and Heroku
// pipeline promotion reuses the slug, which would ship staging's key to
// production (the same trap as the Telegram bot username).
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          language?: string;
        },
      ) => string;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({ sitekey }: { sitekey: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sitekey) {
      return;
    }
    let widgetId: string | undefined;

    const render = () => {
      const container = containerRef.current;
      if (!container || !window.turnstile || container.childElementCount > 0) {
        return;
      }
      widgetId = window.turnstile.render(container, {
        sitekey,
        language: "uk",
        callback: (token) => {
          if (tokenRef.current) {
            tokenRef.current.value = token;
          }
        },
        // A failed or expired challenge clears the token, so a stale one can't
        // be replayed on a later submit — the server would reject it anyway.
        "error-callback": () => {
          if (tokenRef.current) {
            tokenRef.current.value = "";
          }
        },
        "expired-callback": () => {
          if (tokenRef.current) {
            tokenRef.current.value = "";
          }
        },
      });
    };

    if (window.turnstile) {
      render();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${SCRIPT_SRC}"]`,
      );
      if (existing) {
        existing.addEventListener("load", render);
      } else {
        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.addEventListener("load", render);
        document.head.appendChild(script);
      }
    }

    return () => {
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [sitekey]);

  // No sitekey (a local checkout without keys): render nothing. The server
  // decides whether that's acceptable — it fails closed in production.
  if (!sitekey) {
    return null;
  }

  return (
    <div>
      <input ref={tokenRef} type="hidden" name="turnstileToken" />
      <div ref={containerRef} />
    </div>
  );
}
