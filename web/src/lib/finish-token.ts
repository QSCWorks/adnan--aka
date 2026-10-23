import { SignJWT } from 'jose';

function secret(): Uint8Array {
  const s = process.env.ADMIN_PASSWORD ?? 'dev-finish-secret';
  return new TextEncoder().encode(s);
}

export async function createFinishToken(agentId: string, shutdown: boolean): Promise<string> {
  return new SignJWT({ agentId, shutdown })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secret());
}
