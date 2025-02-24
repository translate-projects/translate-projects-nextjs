import * as fs from 'fs';
import * as path from 'path';
import { TypeListLang } from 'translate-projects-core/types';
import { Logger, processDirectoryCache } from 'translate-projects-core/utils';
import { scannerTranslations } from './scanner-translations';
import { syncResourcesTranslate } from './sync-resources-translate';
import { syncTranslationsLangs } from './sync-translations-langs';

export type TranslateProjectOptions = {
  outputDir: string;
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
  outputDir = './public/locales',
  scanner = false,
}: TranslateProjectOptions) => {
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

  try {
    const { filesCache, filesPath } = await processDirectoryCache({
      dir: folderLangBase,
      allowedExtensions: ['.json'], // only process .json files
    });

    const totalTranslations = targetLangs?.length || 0;

    await Logger.success(
      `Total languages to translate: ${totalTranslations}\n`
    );

    await syncResourcesTranslate({
      apiKey,
      filesCache,
      filesPath,
      sourceLang,
    });

    await syncTranslationsLangs({
      apiKey,
      filesCache,
      filesPath,
      outputDir,
      sourceLang,
      targetLangs,
    });

    process.exit(0);
  } catch (error: any) {
    await Logger.error(`\n🛑 **Error:** ${error.message}`);
    await Logger.error(
      '⏳ A timeout error has occurred. We are working to resolve it. Please try again later.\n'
    );
  }
};
