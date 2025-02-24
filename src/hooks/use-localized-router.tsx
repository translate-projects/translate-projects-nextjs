// translate-projects-nextjs/router.js
'use client';

import { NavigateOptions } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useRouter as useNextRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

// Infer router type from useRouter
type NextRouter = ReturnType<typeof useNextRouter>;

// Input type: string or object with pathname, query, and hash
type RouterPath =
  | string
  | { pathname: string; query?: Record<string, string>; hash?: string };

// Define localized router interface with extended methods
interface LocalizedRouter extends NextRouter {
  push: (
    path: RouterPath,
    options?: NavigateOptions,
    newLocale?: string
  ) => Promise<void>;
  replace: (
    path: RouterPath,
    options?: NavigateOptions,
    newLocale?: string
  ) => Promise<void>;
  prefetch: (path: string) => void;
}

export const useLocalizedRouter = (): LocalizedRouter => {
  const router = useNextRouter();
  const { i18n } = useTranslation();
  const locale = i18n.language || 'en'; // Default to 'en' if no language set

  // Convert RouterPath to a full URL string with locale prefix
  const toFullPath = (path: RouterPath, overrideLocale?: string): string => {
    const effectiveLocale = overrideLocale || locale;
    if (typeof path === 'string') {
      const pathStr = String(path || '/');
      return `/${effectiveLocale}${pathStr.startsWith('/') ? pathStr : '/' + pathStr}`;
    } else {
      const { pathname = '/', query, hash } = path || {};
      const pathStr = String(pathname || '/');
      let fullPath = `/${effectiveLocale}${pathStr.startsWith('/') ? pathStr : '/' + pathStr}`;
      if (query && Object.keys(query).length > 0) {
        const queryStr = new URLSearchParams(query).toString();
        fullPath += `?${queryStr}`;
      }
      if (hash) {
        fullPath += `#${hash}`;
      }
      return fullPath;
    }
  };

  // Create a localized router with overridden methods
  const localizedRouter: LocalizedRouter = {
    ...router,
    push: async (path, options, newLocale) =>
      router.push(toFullPath(path, newLocale), options),
    replace: async (path, options, newLocale) =>
      router.replace(toFullPath(path, newLocale), options),
    prefetch: (path) => router.prefetch(toFullPath(path)),
  };

  return localizedRouter;
};
