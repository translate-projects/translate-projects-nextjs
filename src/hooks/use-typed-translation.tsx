import { useTranslation as translation } from 'react-i18next';
import { FlattenKeys } from '../types/flatten-keys';

export const useTypedTranslation = <T,>(namespaces?: string[] | string) => {
  const instance = translation(namespaces);

  return {
    ...instance,
    t: (key: FlattenKeys<T>, args?: string[] | Record<string, string>) =>
      instance.t(key, args as any),
  };
};
