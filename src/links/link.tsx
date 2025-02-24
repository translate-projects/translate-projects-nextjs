'use client';

import NextLink, { LinkProps as NextLinkProps } from 'next/link';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type Props = NextLinkProps & {
  children: ReactNode;
};

export const Link = ({ href, children, ...rest }: Props) => {
  const { i18n } = useTranslation();
  const locale = i18n.language || 'en';

  let localizedHref: any;
  if (typeof href === 'string') {
    localizedHref = `/${locale}${href.startsWith('/') ? href : '/' + href}`;
  } else {
    const { pathname = '/', ...urlRest } = href;
    localizedHref = {
      pathname: `/${locale}${pathname!.startsWith('/') ? pathname : '/' + pathname}`,
      ...urlRest,
    };
  }

  return (
    <NextLink href={localizedHref} {...rest}>
      {children}
    </NextLink>
  );
};
