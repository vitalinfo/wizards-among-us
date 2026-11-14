import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEV_LOGIN_BANNED,
  DEV_LOGIN_ROLES,
  isDevLoginEnabled,
} from "../devLogin";

// This is a login backdoor: the gate is a security boundary, so it gets direct
// allow/deny coverage. Both conditions must hold for it to be enabled.
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isDevLoginEnabled", () => {
  it("is off in production even when the flag is set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_LOGIN", "1");
    expect(isDevLoginEnabled()).toBe(false);
  });

  it("is off outside production when the flag is absent", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_LOGIN", "");
    expect(isDevLoginEnabled()).toBe(false);
  });

  it("is off when the flag is any value other than exactly '1'", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_LOGIN", "true");
    expect(isDevLoginEnabled()).toBe(false);
  });

  it("is on only outside production with the flag set to '1'", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_LOGIN", "1");
    expect(isDevLoginEnabled()).toBe(true);
  });
});

describe("dev login presets", () => {
  // The banned account holds every role, so a page that forgot the ban would
  // let it in rather than fail for want of a role.
  it("bans only the banned preset, which holds every role", () => {
    expect([...DEV_LOGIN_BANNED]).toEqual(["banned"]);
    expect(DEV_LOGIN_ROLES.banned).toEqual(["parent", "volunteer"]);
  });
});
