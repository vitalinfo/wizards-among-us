import {
  type JWTVerifyGetKey,
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
} from "jose";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  decodePendingLogin,
  encodePendingLogin,
  exchangeCode,
  pkceChallenge,
  profileFromIdToken,
  telegramAuthUrl,
} from "../telegramOidc";

const CLIENT_ID = "8959220961";
const ISSUER = "https://oauth.telegram.org";

describe("telegramAuthUrl", () => {
  it("asks Telegram for a code, with PKCE and the bot-messaging scope", () => {
    const url = new URL(
      telegramAuthUrl({
        clientId: CLIENT_ID,
        redirectUri: "https://staging.example/auth/telegram/callback",
        state: "state-1",
        codeChallenge: "challenge-1",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://oauth.telegram.org/auth");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: CLIENT_ID,
      redirect_uri: "https://staging.example/auth/telegram/callback",
      response_type: "code",
      scope: "openid profile telegram:bot_access",
      state: "state-1",
      code_challenge: "challenge-1",
      code_challenge_method: "S256",
    });
  });
});

describe("pkceChallenge", () => {
  it("is base64url(SHA-256(verifier))", () => {
    // SHA-256("abc") = ba7816bf…f20015ad, the FIPS 180-2 test vector.
    expect(pkceChallenge("abc")).toBe(
      "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0",
    );
  });
});

describe("exchangeCode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const args = {
    client: { clientId: CLIENT_ID, clientSecret: "s3cret" },
    code: "code-1",
    codeVerifier: "verifier-1",
    redirectUri: "https://staging.example/auth/telegram/callback",
  };

  it("posts the code with Basic auth and returns the id_token", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ id_token: "jwt" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await exchangeCode(args)).toBe("jwt");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://oauth.telegram.org/token");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from(`${CLIENT_ID}:s3cret`).toString("base64")}`,
    );
    expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
      grant_type: "authorization_code",
      code: "code-1",
      redirect_uri: args.redirectUri,
      client_id: CLIENT_ID,
      code_verifier: "verifier-1",
    });
  });

  it("throws on an error status or a response without an id_token", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 400 }));
    await expect(exchangeCode(args)).rejects.toThrow("400");

    vi.stubGlobal("fetch", async () => new Response("{}"));
    await expect(exchangeCode(args)).rejects.toThrow("no id_token");
  });
});

describe("profileFromIdToken", () => {
  let keys: JWTVerifyGetKey;
  let sign: (
    claims: Record<string, unknown>,
    options?: {
      issuer?: string;
      audience?: string;
      expiresIn?: string | number;
    },
  ) => Promise<string>;

  beforeAll(async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
    keys = createLocalJWKSet({ keys: [jwk] });
    sign = (claims, options = {}) =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: "RS256", kid: "k1" })
        .setIssuer(options.issuer ?? ISSUER)
        .setAudience(options.audience ?? CLIENT_ID)
        .setSubject("1234123412341234123")
        .setIssuedAt(1793802544)
        .setExpirationTime(options.expiresIn ?? "1h")
        .sign(privateKey);
  });

  // The documented shape: `id` is the numeric Telegram id, `sub` is not.
  const claims = {
    id: 419335961,
    name: "Віталій Р.",
    given_name: "Віталій",
    family_name: "Р.",
    preferred_username: "vital",
    picture: "https://t.me/i/userpic/320/x.jpg",
  };

  it("maps a verified token to the profile, keyed by the numeric id", async () => {
    expect(
      await profileFromIdToken(await sign(claims), CLIENT_ID, keys),
    ).toEqual({
      id: "419335961",
      firstName: "Віталій",
      lastName: "Р.",
      username: "vital",
      photoUrl: "https://t.me/i/userpic/320/x.jpg",
      authDate: 1793802544,
    });
  });

  it("falls back to `name` and leaves absent fields undefined", async () => {
    const token = await sign({ id: "419335961", name: "Віталій" });
    expect(await profileFromIdToken(token, CLIENT_ID, keys)).toEqual({
      id: "419335961",
      firstName: "Віталій",
      lastName: undefined,
      username: undefined,
      photoUrl: undefined,
      authDate: 1793802544,
    });
  });

  it("refuses a token without a numeric id rather than keying on sub", async () => {
    const noId: Record<string, unknown> = { ...claims };
    delete noId.id;
    await expect(
      profileFromIdToken(await sign(noId), CLIENT_ID, keys),
    ).rejects.toThrow(/no numeric id \(claims: .*sub/);
    await expect(
      profileFromIdToken(await sign({ ...claims, id: "abc" }), CLIENT_ID, keys),
    ).rejects.toThrow("no numeric id");
  });

  it("refuses another bot's token, another issuer, or an expired one", async () => {
    await expect(
      profileFromIdToken(
        await sign(claims, { audience: "111" }),
        CLIENT_ID,
        keys,
      ),
    ).rejects.toThrow();
    await expect(
      profileFromIdToken(
        await sign(claims, { issuer: "https://evil.example" }),
        CLIENT_ID,
        keys,
      ),
    ).rejects.toThrow();
    await expect(
      profileFromIdToken(
        await sign(claims, { expiresIn: 1700000000 }),
        CLIENT_ID,
        keys,
      ),
    ).rejects.toThrow();
  });

  it("refuses a token signed with another key", async () => {
    const { privateKey } = await generateKeyPair("RS256");
    const forged = await new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(ISSUER)
      .setAudience(CLIENT_ID)
      .setExpirationTime("1h")
      .sign(privateKey);
    await expect(profileFromIdToken(forged, CLIENT_ID, keys)).rejects.toThrow();
  });
});

describe("pending login cookie", () => {
  it("round-trips", () => {
    const pending = { state: "s", verifier: "v", next: "/account/parent" };
    expect(decodePendingLogin(encodePendingLogin(pending))).toEqual(pending);
  });

  it("treats anything else as no login in progress", () => {
    expect(decodePendingLogin(undefined)).toBeNull();
    expect(decodePendingLogin("%%%")).toBeNull();
    expect(
      decodePendingLogin(Buffer.from('{"state":"s"}').toString("base64url")),
    ).toBeNull();
  });
});
