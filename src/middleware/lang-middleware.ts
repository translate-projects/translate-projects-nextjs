import { NextResponse } from 'next/server';

export type LangMiddlewareOptions = {
  request: any;
  defaultLocale: string;
  locales: string[];
  ignorePaths?: string[];
};

// The browser's languages by preference ("en-US,en;q=0.9,pt;q=0.8"), each matched exactly or by base: "pt" -> "pt-BR", "en-US" -> "en"
const fromAcceptLanguage = (header: string | null, locales: string[]) => {
  const wanted = (header ?? '')
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.toLowerCase(), q: q === undefined ? 1 : Number(q) };
    })
    .filter((l) => l.tag && l.tag !== '*' && l.q > 0)
    .sort((a, b) => b.q - a.q);
  const base = (tag: string) => tag.split('-')[0];
  for (const { tag } of wanted) {
    const match =
      locales.find((l) => l.toLowerCase() === tag) ??
      locales.find((l) => l.toLowerCase() === base(tag)) ??
      locales.find((l) => base(l.toLowerCase()) === base(tag));
    if (match) return match;
  }
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

  // No locale in the URL: the one the user chose before (cookie), else the browser's, else the default
  const cookie = request.cookies?.get?.('NEXT_LOCALE')?.value;
  const locale =
    (locales.includes(cookie) && cookie) ||
    fromAcceptLanguage(request.headers?.get?.('accept-language'), locales) ||
    defaultLocale;
  const url = new URL(
    `/${locale}${pathname === '/' ? '' : pathname}${request.nextUrl.search ?? ''}`,
    request.url
  );
  return NextResponse.redirect(url);
}
