import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { hashPassword, isLegacyHash, verifyPassword } from "./auth.server";

describe("passwords", () => {
  it("accepts the right password and rejects a wrong one (scrypt)", async () => {
    const stored = await hashPassword("correct horse");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("wrong horse", stored)).toBe(false);
  });

  it("accepts passwords carried over from Supabase (bcrypt $2a$)", async () => {
    // Supabase hashes look like $2a$10$…; the importer stores them as bcrypt$<hash>.
    const supabaseHash = bcrypt.hashSync("old password", 10).replace(/^\$2b\$/, "$2a$");
    const stored = `bcrypt$${supabaseHash}`;
    expect(isLegacyHash(stored)).toBe(true);
    expect(await verifyPassword("old password", stored)).toBe(true);
    expect(await verifyPassword("not it", stored)).toBe(false);
  });

  it("rejects malformed hashes", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "md5$abc")).toBe(false);
  });
});
