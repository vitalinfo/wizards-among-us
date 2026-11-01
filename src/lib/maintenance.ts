// Maintenance mode: while MAINTENANCE_MODE is on, the middleware serves every
// page and API route as the maintenance screen.
//
// Read at REQUEST time, like every other per-app var, so it is switched with a
// Heroku config var change (which restarts the dyno) — no rebuild, and a
// pipeline promotion never carries staging's value into production.

export const MAINTENANCE_PATH = "/maintenance";

export function isMaintenanceMode(): boolean {
  const value = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  return value === "1" || value === "true";
}
