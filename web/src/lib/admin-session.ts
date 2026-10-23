import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE = 'rp_admin';
const MAX_AGE = 60 * 60 * 8;

function secret(): Uint8Array {
  const s = process.env.ADMIN_PASSWORD;
  if (!s) throw new Error('ADMIN_PASSWORD tanımlı değil');
  return new TextEncoder().encode(s);
}

export async function createAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function readAdminSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export { COOKIE, MAX_AGE };
