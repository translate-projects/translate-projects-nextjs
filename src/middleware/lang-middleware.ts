import { NextResponse } from 'next/server';

type LangMiddlewareOptions = {
  request: any;
  defaultLocale: string;
  locales: string[];
  ignorePaths?: string[];
};

export function langMiddleware({
  request,
  defaultLocale,
  locales,
  ignorePaths = [],
}: LangMiddlewareOptions) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/locales') ||
    pathname.startsWith('/favicon.ico') ||
    ignorePaths.some((path) => pathname.startsWith(path))
  ) {
    return NextResponse.next();
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    const locale = pathname.split('/')[1];
    if (locales.includes(locale)) {
      // Set NEXT_LOCALE cookie
      const response = NextResponse.next();
      response.cookies.set('NEXT_LOCALE', locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      return response;
    }
    return NextResponse.redirect(
      new URL(`/${defaultLocale}${pathname}`, request.url)
    );
  }

  const newUrl = new URL(`/${defaultLocale}${pathname}`, request.url);
  const response = NextResponse.redirect(newUrl);
  response.cookies.set('NEXT_LOCALE', defaultLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
