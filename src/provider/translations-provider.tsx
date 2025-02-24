'use client';
import { i18n, Resource } from 'i18next';
import { TypeListLang } from 'translate-projects-core/types';
import { initTranslations } from '../utils/i18n';
import { TranslationsProviderBase } from './translations-provider-base';

type TypeI18nConfig = {
  fallbackLng: TypeListLang[];
  resources?: Resource;
  namespaces?: string[];
  backendPaths?: string;
  debug?: boolean;
  dirResources?: string;
  supportedLngs?: string[];
};

type Props = {
  i18nInstance?: i18n;
  i18nConfig?: TypeI18nConfig;
  children: React.ReactNode;
  lng: TypeListLang;
  initialLocale?: TypeListLang;
};

export const TranslationsProvider = ({
  children,
  lng,
  initialLocale,
  i18nConfig,
  i18nInstance,
}: Props) => {
  const i18nInstanceConfig =
    i18nInstance ??
    initTranslations({
      lng,
      fallbackLng: i18nConfig?.fallbackLng,
      resources: i18nConfig?.resources,
      namespaces: i18nConfig?.namespaces,
      debug: i18nConfig?.debug,
      dirResources: i18nConfig?.dirResources,
      supportedLngs: i18nConfig?.supportedLngs,
    });
  if (i18nInstanceConfig.language !== initialLocale) {
    i18nInstanceConfig.changeLanguage(initialLocale);
  }

  return (
    <TranslationsProviderBase i18n={i18nInstanceConfig}>
      {children}
    </TranslationsProviderBase>
  );
};
