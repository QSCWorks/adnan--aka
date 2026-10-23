import { NextResponse } from 'next/server';

import { COOKIE, MAX_AGE, createAdminToken } from '@/lib/admin-session';

export async function POST(req: Request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: 'Panel yapılandırılmamış' }, { status: 503 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  }

  if (body.password !== password) {
    return NextResponse.json({ error: 'Parola yanlış' }, { status: 401 });
  }

  const token = await createAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
  return res;
}
