// Every primary key is a Postgres `uuid`, and Postgres answers a malformed one
// with an ERROR, not an empty result. So an id taken from a URL segment is
// checked here first: a scanner's `/admin/applications/index.php` is a 404,
// not a 500. The canonical hyphenated form is the only one we ever issue.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}
