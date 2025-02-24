import * as fs from 'fs';
import { Resource } from 'i18next';
import * as path from 'path';
import { Logger } from 'translate-projects-core/utils';

export const readResources = (
  dirResourcesBase: string,
  supportedLngs?: string[]
) => {
  const resources: Resource = {};

  try {
    // Read all language directories (e.g., en, es, fr)
    const langDirs = fs.readdirSync(dirResourcesBase, { withFileTypes: true });

    for (const langDir of langDirs) {
      if (!langDir.isDirectory()) continue; // Skip if it's not a directory
      const lang = langDir.name;

      // Skip languages that are not in supportedLngs (if provided)
      if (supportedLngs && !supportedLngs.includes(lang)) continue;

      resources[lang] = {};

      // Read all JSON files inside the language folder
      const langPath = path.join(dirResourcesBase, lang);
      const files = fs.readdirSync(langPath);

      for (const file of files) {
        if (!file.endsWith('.json')) continue; // Skip non-JSON files
        const namespace = path.basename(file, '.json'); // Extract namespace from filename
        const filePath = path.join(langPath, file);

        // Read and parse the JSON file synchronously
        const content = fs.readFileSync(filePath, 'utf-8');
        resources[lang][namespace] = JSON.parse(content);
      }
    }

    return resources;
  } catch (err: any) {
    Logger.error(`Error reading translation resources: ${err.message}`);
  }
};
