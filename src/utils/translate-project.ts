import * as fs from 'fs';
import * as path from 'path';
import { TypeListLang } from 'translate-projects-core/types';
import { Logger, processDirectoryCache } from 'translate-projects-core/utils';
import { scannerTranslations } from './scanner-translations';
import { syncResourcesTranslate } from './sync-resources-translate';
import { syncTranslationsLangs } from './sync-translations-langs';

export type TranslateProjectOptions = {
  outputDir?: string;
  sourceLang: TypeListLang;
  targetLangs: TypeListLang[];
  apiKey: string;
  scanner?:
    | {
        sourceDir: string;
      }
    | boolean;
};

export const translateProject = async ({
  targetLangs,
  sourceLang,
  apiKey,
  outputDir = './src/locales',
  scanner = false,
}: TranslateProjectOptions) => {
  if (!apiKey) {
    throw new Error(
      'Missing apiKey: set TRANSLATE_PROJECTS_API_KEY or pass apiKey in translate.config.mjs.'
    );
  }

  const folderLangBase = path.join(outputDir, sourceLang);

  if (!fs.existsSync(folderLangBase)) {
    await Logger.info(
      `📂 Creating folder for language ${sourceLang.toUpperCase()}...**\n`
    );
    fs.mkdirSync(folderLangBase, { recursive: true });
  }

  await Logger.success(`\n🌍🚀 Starting translation process...\n`);

  if (scanner) {
    await scannerTranslations({
      folderLangBase,
      outputDir,
      scanner,
      sourceLang,
    });
  }

  const { filesCache, filesPath } = await processDirectoryCache({
    dir: folderLangBase,
    allowedExtensions: ['.json'], // only process .json files
  });

  await Logger.success(
    `Total languages to translate: ${targetLangs?.length || 0}\n`
  );

  await syncResourcesTranslate({
    apiKey,
    filesCache,
    filesPath,
    sourceLang,
  });

  const failedLangs = await syncTranslationsLangs({
    apiKey,
    filesCache,
    filesPath,
    outputDir,
    sourceLang,
    targetLangs,
  });

  if (failedLangs.length) {
    throw new Error(
      `Incomplete translations for: ${failedLangs.join(', ')}. Existing files were kept, run again to retry.`
    );
  }
};
