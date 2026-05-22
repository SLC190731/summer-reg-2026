import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * 使用 Node 內建 scrypt 對密碼進行雜湊，輸出格式：
 *   scrypt$<iterations>$<saltHex>$<hashHex>
 * 其中 iterations 是 N 參數，固定為 16384（預設安全等級）
 */
const N = 16384;
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = scryptSync(password.normalize("NFKC"), salt, KEYLEN, { N });
  return `scrypt$${N}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const salt = Buffer.from(parts[2] ?? "", "hex");
  const expected = Buffer.from(parts[3] ?? "", "hex");
  if (!Number.isFinite(n) || salt.length === 0 || expected.length === 0) return false;
  const derived = scryptSync(password.normalize("NFKC"), salt, expected.length, { N: n });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
