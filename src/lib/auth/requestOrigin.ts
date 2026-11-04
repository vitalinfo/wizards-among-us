// The origin the person is on — what Telegram's redirect_uri is built from, and
// it must match a URL registered with BotFather. Not siteOrigin(): locally that
// is production's URL. Not request.url either: behind Heroku's router that is
// the dyno's internal address. The router passes the public Host through and
// reports the scheme in x-forwarded-proto, and the middleware has already moved
// the request to the canonical host.
export function requestOrigin(headers: Headers): string {
  const proto = headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${headers.get("host")}`;
}
