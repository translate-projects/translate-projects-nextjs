import i18next, { Resource } from 'i18next';
import { initReactI18next } from 'react-i18next/initReactI18next';
import { TypeListLang } from 'translate-projects-core/types';

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
  supportedLngs,
  defaultNS,
}: TypeInitTranslations) => {
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
