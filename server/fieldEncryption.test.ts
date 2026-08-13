import { describe, expect, it } from "vitest";
import {
  DATA_ENCRYPTION_PREFIX,
  decryptFields,
  decryptJson,
  decryptSensitive,
  encryptFields,
  encryptJson,
  encryptSensitive,
} from "./_core/fieldEncryption";

describe("field encryption", () => {
  it("encrypts and decrypts sensitive text without exposing the plaintext", () => {
    const plaintext = "Contacto reservado 923000000";
    const encrypted = encryptSensitive(plaintext);

    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptSensitive(encrypted)).toBe(plaintext);
    expect(encryptSensitive(encrypted)).toBe(encrypted);
  });

  it("encrypts only the selected fields and preserves null values", () => {
    const source = { name: "Membro", phone: "923000000", email: null };
    const encrypted = encryptFields(source, ["phone", "email"]);

    expect(encrypted.name).toBe(source.name);
    expect(encrypted.phone).toMatch(new RegExp(`^${DATA_ENCRYPTION_PREFIX}`));
    expect(encrypted.email).toBeNull();
    expect(decryptFields(encrypted, ["phone", "email"])).toEqual(source);
  });

  it("encrypts and decrypts backup JSON", () => {
    const snapshot = { members: [{ id: 1, name: "Membro" }], total: 1 };
    const encrypted = encryptJson(snapshot);

    expect(encrypted).toMatch(/^enc:v1:/);
    expect(decryptJson(encrypted)).toEqual(snapshot);
  });

  it("returns null when the authenticated ciphertext is modified", () => {
    const encrypted = encryptSensitive("conteúdo protegido") as string;
    const payload = encrypted.slice(DATA_ENCRYPTION_PREFIX.length);
    const tamperIndex = 4;
    const current = payload[tamperIndex];
    const replacement = current === "A" ? "B" : "A";
    const tamperedPayload = `${payload.slice(0, tamperIndex)}${replacement}${payload.slice(tamperIndex + 1)}`;
    const tampered = `${DATA_ENCRYPTION_PREFIX}${tamperedPayload}`;

    expect(decryptSensitive(tampered)).toBeNull();
  });
});
