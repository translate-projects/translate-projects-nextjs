import * as fs from 'fs';
import * as path from 'path';
import { FilePathData, TypeListLang } from 'translate-projects-core/types';
import {
  assignHashKeysJson,
  Logger,
  makeTranslations,
  readJsonFile,
  updateFileCache,
} from 'translate-projects-core/utils';
import { assignValuesFlatten } from './assign-values-flatten';
import { compareKeysArrayLangs } from './compare-keys-array-langs';
import { flattenJson } from './flatten-json';
import { unflattenJson } from './unflatten-json';

type SyncTranslationsLangOptions = {
  apiKey: string;
  filesCache: Record<string, string>;
  filesPath: Record<string, FilePathData>;
  sourceLang: TypeListLang;
  targetLangs: TypeListLang[];
  outputDir: string;
};

/**
 * Writes one file per target language next to the source folder.
 * A language that fails keeps its previous file and is returned so the caller can report it.
 */
export const syncTranslationsLangs = async ({
  filesPath,
  targetLangs,
  sourceLang,
  apiKey,
  outputDir,
}: SyncTranslationsLangOptions): Promise<TypeListLang[]> => {
  const failedLangs = new Set<TypeListLang>();

  for (const [key, item] of Object.entries(filesPath)) {
    const jsonData = flattenJson(readJsonFile(item.path));
    const jsonFlatten = await assignHashKeysJson(jsonData);

    // the source folder is the input: rewriting it can only lose texts
    for (const locale of targetLangs.filter((l) => l !== sourceLang)) {
      let translations = item.translations[locale];
      const { areEqual } = compareKeysArrayLangs(
        Object.keys(jsonFlatten),
        Object.keys(translations ?? {})
      );

      if (!translations || !item.in_cache || !areEqual) {
        if (!Object.keys(jsonFlatten).length) continue;

        await Logger.info(`Syncing translations (${locale}) ... \n`);

        translations = await makeTranslations({
          sourceLang,
          targetLang: locale,
          apiKey,
          route_file: item.path,
          cache_hash: item.cache_hash,
        });

        if (!translations) {
          failedLangs.add(locale);
          continue;
        }

        await updateFileCache({
          fileHash: key,
          translations: { [locale]: translations },
        });
      }

      const folderLang = path.join(outputDir, locale);

      if (!fs.existsSync(folderLang)) {
        await Logger.info(`📂 Creating output directory... \n`);
        fs.mkdirSync(folderLang, { recursive: true });
      }

      const outputFilePath = path.join(folderLang, path.basename(item.path));

      const previous = fs.existsSync(outputFilePath)
        ? flattenJson(readJsonFile(outputFilePath) ?? {})
        : {};

      const addvaluesFlatten = await assignValuesFlatten(
        jsonData,
        translations
      );

      // A partial response (e.g. MISSING_API_KEY) keeps the previous translation of missing texts
      const missing = Object.keys(addvaluesFlatten).filter(
        (k) => addvaluesFlatten[k] == null
      );
      for (const k of missing) addvaluesFlatten[k] = previous[k];

      if (missing.length) {
        failedLangs.add(locale);
        await Logger.warning(
          `⚠️ ${missing.length} texts without translation in ${locale.toUpperCase()}, they will be retried on the next run\n`
        );
      }

      fs.writeFileSync(
        outputFilePath,
        JSON.stringify(unflattenJson(addvaluesFlatten), null, 2)
      );

      await Logger.success(
        `Translation completed: ${locale.toUpperCase()} 📄 -> 📁 \`${outputFilePath}\`\n`
      );
    }
  }

  return [...failedLangs];
};
