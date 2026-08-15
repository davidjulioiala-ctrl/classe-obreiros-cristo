import { describe, expect, it } from "vitest";
import {
  buildTotpUri,
  consumeRecoveryCode,
  createTwoFactorChallengeToken,
  generateRecoveryCodes,
  serializeRecoveryCodes,
  verifyTotpCode,
  verifyTwoFactorChallengeToken,
} from "./_core/twoFactor";

function hotp(secret: string, counter: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of secret) bits += alphabet.indexOf(character).toString(2).padStart(5, "0");
  const key = Buffer.alloc(Math.floor(bits.length / 8));
  for (let index = 0; index < key.length; index += 1) key[index] = Number.parseInt(bits.slice(index * 8, index * 8 + 8), 2);
  const crypto = require("node:crypto") as typeof import("node:crypto");
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(value % 1_000_000).padStart(6, "0");
}

describe("twoFactor", () => {
  it("verifies a TOTP code with the accepted clock window", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const now = 1_234_567_890_000;
    const counter = Math.floor(now / 1000 / 30);
    expect(verifyTotpCode(secret, hotp(secret, counter), now)).toBe(true);
    expect(verifyTotpCode(secret, hotp(secret, counter - 3), now)).toBe(false);
  });

  it("consumes a recovery code only once", () => {
    const codes = generateRecoveryCodes(2);
    const serialized = serializeRecoveryCodes(codes);
    const remaining = consumeRecoveryCode(serialized, codes[0]);
    expect(remaining).not.toBeNull();
    expect(consumeRecoveryCode(remaining, codes[0])).toBeNull();
    expect(consumeRecoveryCode(remaining, codes[1])).not.toBeNull();
  });

  it("signs a short-lived challenge and rejects tampering or expiry", () => {
    const issuedAt = 1_700_000_000_000;
    const token = createTwoFactorChallengeToken(7, 3, issuedAt);
    expect(verifyTwoFactorChallengeToken(token, issuedAt + 60_000)).toMatchObject({ userId: 7, sessionVersion: 3 });
    expect(verifyTwoFactorChallengeToken(`${token}x`, issuedAt + 60_000)).toBeNull();
    expect(verifyTwoFactorChallengeToken(token, issuedAt + 6 * 60_000)).toBeNull();
  });

  it("builds a standard authenticator URI", () => {
    const uri = buildTotpUri("JBSWY3DPEHPK3PXP", "admin", "Classe Obreiros de Cristo");
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("digits=6");
  });
});
