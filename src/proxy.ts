import { auth } from '@/lib/auth/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  if (!auth) return NextResponse.next();
  return auth.middleware({ loginUrl: '/auth/sign-in' })(request);
}

export const config = {
  matcher: ['/account/:path*'],
};
