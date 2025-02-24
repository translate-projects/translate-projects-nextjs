#!/usr/bin/env node

// translate-projects-nextjs/bin/translate-cli.mjs

import fs from 'fs';
import path from 'path';
import { Logger } from 'translate-projects-core/utils';
import { translateProject } from 'translate-projects-nextjs';

/**
 * Loads the configuration file dynamically, supporting both ESM and CommonJS formats.
 *
 * @param configPath - Path to the configuration file (e.g., 'translate.config.mjs')
 * @returns The parsed configuration object
 * @throws Error if the file doesn't exist, is invalid, or lacks required fields
 */
async function loadConfig(configPath) {
  // Check if the configuration file exists
  if (!fs.existsSync(configPath)) {
    throw new Error(
      'Configuration file "translate.config.mjs" not found in project root.'
    );
  }

  try {
    // Attempt to load the file as an ES Module first
    let configModule;
    try {
      configModule = await import(configPath);
    } catch (esmError) {
      // Fallback to CommonJS if ESM loading fails
      configModule = require(configPath); // Note: This will fail in .mjs without createRequire
    }

    // Extract config, supporting both ESM (export default) and CommonJS (module.exports)
    const config = configModule.default || configModule;

    // Validate that config is a non-null object
    if (!config || typeof config !== 'object') {
      throw new Error(
        '"translate.config.mjs" must export a valid configuration object.'
      );
    }

    // Check for required fields
    const requiredFields = ['sourceLang', 'targetLangs', 'apiKey'];
    const missingFields = requiredFields.filter((field) => !config[field]);
    if (missingFields.length > 0) {
      throw new Error(
        `Missing required configuration fields: ${missingFields.join(', ')}.`
      );
    }

    return config;
  } catch (err) {
    throw new Error(`Failed to load configuration file: ${err.message}`);
  }
}

/**
 * Main CLI function to execute the translation process.
 * Loads config, runs translation, and handles success/error cases.
 */
async function runCLI() {
  // Define the expected path to the configuration file
  const configFilePath = path.join(process.cwd(), 'translate.config.mjs');

  try {
    // Inform the user that the translation process is starting
    await Logger.info('Starting project translation...');

    // Load and validate the configuration
    const config = await loadConfig(configFilePath);

    // Execute the translation process with provided config
    await translateProject({
      scanner: config?.scanner,
      sourceLang: config.sourceLang,
      targetLangs: config.targetLangs,
      apiKey: config.apiKey,
    });

    // Log success and exit with a success code
    await Logger.success('Translation completed successfully.');
    process.exit(0);
  } catch (err) {
    // Log any errors encountered during execution
    await Logger.error(err.message);
    await Logger.info(
      'Please create a valid "translate.config.mjs" file or check your configuration.'
    );
    // Exit with an error code
    process.exit(1);
  }
}

// Run the CLI
runCLI();
