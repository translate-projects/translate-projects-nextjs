import { validateChangesFiles } from 'translate-projects-core';
import { FilePathData, TypeListLang } from 'translate-projects-core/types';
import {
  assignHashKeysJson,
  Logger,
  readJsonFile,
  syncResources,
  updateFileCache,
} from 'translate-projects-core/utils';
import { flattenJson } from './flatten-json';

type SyncResourcesTranslateOptions = {
  apiKey: string;
  filesCache: Record<string, string>;
  filesPath: Record<string, FilePathData>;
  sourceLang: TypeListLang;
};

export const syncResourcesTranslate = async ({
  apiKey,
  filesCache,
  filesPath,
  sourceLang,
}: SyncResourcesTranslateOptions) => {
  const result = await validateChangesFiles({
    apiKey,
    data: filesCache,
  });

  if (!result?.data) {
    throw new Error(
      'Could not validate files with Translate Projects. Check your apiKey.'
    );
  }

  for (const fileHash of Object.keys(filesPath)) {
    filesPath[fileHash].in_cache = Boolean(!result.data[fileHash]);
  }

  // sycn files data
  const items = Object.entries(filesPath);

  for (const [key, item] of items) {
    // if any file in cache
    if (item.in_cache && Object.keys(item.sources).length) {
      continue;
    }

    const jsonData = flattenJson(readJsonFile(item.path));

    const jsonFlatten = await assignHashKeysJson(jsonData);

    if (!Object.keys(jsonFlatten).length) {
      await Logger.info(`❌ don't found keys in ${item.path}. \n`);
      continue;
    }

    await Logger.info(
      `🔄 Syncing (${Object.keys(jsonFlatten).length}) - ${item.path}... \n`
    );

    const synced = await syncResources({
      sourceLang,
      data: jsonFlatten,
      typeProject: 'next.js',
      apiKey,
      route_file: item.path,
      cache_hash: item.cache_hash,
    });

    // syncResources returns null on failure; caching would skip the file next run
    if (synced === null) {
      throw new Error(`Could not sync ${item.path} with Translate Projects.`);
    }

    await updateFileCache({
      fileHash: key,
      sources: jsonFlatten,
    });
  }
};
