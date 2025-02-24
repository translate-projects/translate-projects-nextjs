import i18next, { Resource } from 'i18next';
import * as path from 'path';
import { initReactI18next } from 'react-i18next/initReactI18next';
import { TypeListLang } from 'translate-projects-core/types';
import { readResources } from './read-resources';

type TypeInitTranslations = {
  lng: string;
  fallbackLng?: TypeListLang[];
  resources?: Resource;
  namespaces?: string[];
  debug?: boolean;
  dirResources?: string;
  supportedLngs?: string[];
  defaultNS?: string;
};

export const initTranslations = ({
  lng,
  fallbackLng,
  resources,
  namespaces,
  debug,
  dirResources = 'public/locales',
  supportedLngs,
  defaultNS,
}: TypeInitTranslations) => {
  // logic get dir resources
  if (!resources) {
    // read folder resources
    const dirResourcesPath = path.join(process.cwd(), dirResources, lng);
    resources = readResources(dirResourcesPath, supportedLngs);
  }

  const i18nInstance = i18next.createInstance();

  i18nInstance.use(initReactI18next).init({
    lng,
    fallbackLng,
    react: {
      useSuspense: false,
    },
    interpolation: {
      escapeValue: false,
    },
    ns: namespaces || ['translation'],
    defaultNS: defaultNS ?? 'translation',
    debug,
    resources,
    supportedLngs: supportedLngs || [],
  });

  return i18nInstance;
};
