'use client';

import { I18nextProvider } from 'react-i18next';

type Props = {
  children: React.ReactNode;
  i18n: any;
};

export const TranslationsProviderBase = ({ children, i18n }: Props) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
