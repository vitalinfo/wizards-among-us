// The script on /auth/telegram/return, the page Telegram sends a person back
// to with the signed login data in the fragment (`#tgAuthResult=<base64url
// JSON>`). A fragment never reaches a server, so this forwards it to
// /auth/telegram, which checks the signature and re-validates `next`.
//
// An INLINE script, not a client component: it runs as soon as the browser
// parses it, instead of after the JS bundle has downloaded and React has
// hydrated. On a slow phone that wait was long enough for people to tap the
// login button again and start the round trip over (prod, Nov 2026).
//
// Plain ES5-style JS in a string, because that string is exactly what ships —
// the spec evaluates it as is.
//
// Decoded as UTF-8, not atob's Latin-1: a Cyrillic first name must reach the
// signature check byte-for-byte as Telegram signed it. Anything unusable (a
// cancelled login, a mangled fragment) goes back to /login, keeping `next`.
export const TELEGRAM_RETURN_SCRIPT = `(function () {
  var target = "/login" + location.search;
  var match = /[#&]tgAuthResult=([A-Za-z0-9_=-]*)$/.exec(location.hash);
  if (match) {
    try {
      var binary = atob(match[1].replace(/-/g, "+").replace(/_/g, "/"));
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      var data = JSON.parse(new TextDecoder().decode(bytes));
      if (data && typeof data === "object" && "hash" in data) {
        var params = new URLSearchParams();
        for (var key in data) params.set(key, String(data[key]));
        var next = new URLSearchParams(location.search).get("next");
        if (next) params.set("next", next);
        target = "/auth/telegram?" + params.toString();
      }
    } catch (e) {}
  }
  location.replace(target);
})();`;
