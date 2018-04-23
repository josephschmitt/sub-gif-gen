#!/usr/bin/env node -r esm

import template from 'art-template';
import chalk from 'chalk';
import fs from 'fs-extra';
import {expandPaths} from 'glob-extra';
import minimist from 'minimist';
import path from 'path';

import {cleanText} from '../lib/utils.js';

/**
 * Creates a single JSON file used to populate a search index based on a template file depending on
 * what search indexing service you're using.
 *
 * @param {String} indexes -- minimatch-compatible globa of json subtitle structured data to load.
 *     The json should be parsed subtitles as JSON
 * @param {String} tmpl -- Path to art template file to outputting the single searchable index for
 * the gif library
 * @param {String} output -- Path to output the index to
 * @returns {Promise}
 */
export default async function createIndex(indexes, tmpl, output) {
  const paths = await expandPaths(indexes, {formats: ['.json']});
  const merged = paths.reduce((obj, jsonPath) => {
    return obj.concat(fs.readJsonSync(jsonPath));
  }, []);

  await fs.outputFile(output, template(path.resolve(process.cwd(), tmpl), {
    subs: merged.reduce((json, val) => {
      return json.concat(Object.assign(val, {
        text: cleanText(val.text).replace(/\n/g, '\\n'),
      }));
    }, []),
  }));

  console.info('Search index created at ', chalk.green(output));
  return output;
}

/**
 * Called as CLI
 *
 * Example:
 *   ./createIndex.js --template path/to/template.art --indexes path/to/index/*.json -- output.json
 */
if (require && require.main === module) {
  const {indexes, '--': [output], template} = minimist(process.argv.slice(2), {
    string: ['template', 'indexes'],
    alias: {
      template: ['t'],
      indexes: ['i'],
    },
    '--': true,
  });

  createIndex(indexes, template, output).catch((e) => {
    console.error(chalk.red(e));
    process.exit(1);
  });
}
