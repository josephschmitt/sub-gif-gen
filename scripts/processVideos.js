#!/usr/bin/env node -r esm

import chalk from 'chalk';
import fs from 'fs-extra';
import klaw from 'klaw-promise';
import minimist from 'minimist';
import moment from 'moment';
import path from 'path';
import parser from 'subtitles-parser';
import UrlSafeString from 'url-safe-string';

import {convertTimeToTimestamp} from '../lib/converttime.js';
import {cleanText} from '../lib/utils.js';

import convertToGif from './convertToGif.js';
import convertToVideo from './convertToVideo.js';

const {generate: safeString} = new UrlSafeString();
const convertFnMap = {
  gif: convertToGif,
  mp4: convertToVideo,
  webm: convertToVideo,
};

/**
 * Converts a single video into multiple animated gifs, each gif mapping to a section of the video's
 * subtitles.
 *
 * @param {String} input -- Path to the input video
 * @param {String} output -- Path to output the gif to
 * @param {Object} options
 */
export default async function processVideo(input, output,
    {allowedExtensions, flatten, formats, lang, offset, sanitize, skipExisting}) {
  const t1 = new Date();

  const dirname = path.dirname(input);
  const basename = allowedExtensions.reduce((val, cur) => path.basename(val, cur), input);
  const sanitizedName = sanitize ? safeString(basename) : basename;
  const srtFile = path.join(dirname, basename + '.srt');

  const srtContents = await resolveSrtFile(srtFile, lang);
  if (!srtContents) {
    const warningsFile = path.resolve(process.cwd(), output, '../', 'warnings.txt');
    await fs.ensureFile(warningsFile);

    const warnings = await fs.readFile(warningsFile, 'utf-8');
    return await fs.outputFile(warningsFile, warnings + '\nNot Found: ' + srtFile);
  }

  const subs = parser.fromSrt(srtContents);

  console.info(chalk.green('Processing'), path.basename(input) + chalk.gray('...'));

  for (const sub of subs) {
    let {startTime, endTime, text} = sub;

    let startTimeMs = convertTimeToTimestamp(startTime.replace(',', '.'));
    let durationMs = convertTimeToTimestamp(endTime.replace(',', '.')) - startTimeMs;

    const outputDir = path.resolve(process.cwd(), output, (flatten ? '' : basename));

    sub.id = sanitizedName + '-' + startTimeMs;
    sub.name = sanitizedName;

    await fs.ensureDir(outputDir);

    const seekTo = Math.max(0, startTimeMs / 1000 - (offset || 0));
    const duration = durationMs / 1000 + (offset || 0) * 2;

    if (!durationMs || !duration) {
      continue;
    }

    // Format times by removing commas and re-moving leading hour mark until necessary
    const startTimeFmt = startTime.replace(',', '.').replace('00:', '');
    const endTimeFmt = endTime.replace(',', '.').replace('00:', '');

    const sizes = [];
    for (const fmt of formats.split(',')) {
      const convertFn = convertFnMap[fmt];
      const outputFile = path.resolve(outputDir, sanitizedName + `-${startTimeMs}.${fmt}`);

      if (skipExisting && await fs.pathExists(outputFile)) {
        continue;
      }

      if (typeof convertFn === 'function') {
        const converted = await convertFn(input, outputFile, seekTo, duration, text);
        sizes.push(`${fmt}: ${((await fs.stat(converted)).size / 1000000).toFixed(2)}MB`);
      }
    }

    if (sizes.length) {
      console.info(`  ${chalk.cyan(startTimeFmt) + chalk.gray('-') + chalk.cyan(endTimeFmt)}:`,
          cleanText(text).replace(/\n/g, ' '), chalk.gray(`[${sizes.join(', ')}]`));
    }
  }

  await fs.outputJson(path.resolve(process.cwd(), output, sanitizedName + '.index.json'), subs);

  console.info('Finished generating ' + chalk.green(subs.length) + ' gifs in ' +
      moment().from(t1, true) + '\n');
}

/**
 * Takes in a path to an srt and returns its contents as a string. If the file can't be read, it'll
 * return null and output a warning.
 *
 * @param {String} srtFile -- Path to srt file
 * @param {String} [lang='en'] -- Optional language code. Default to 'en'
 */
async function resolveSrtFile(srtFile, lang = 'en') {
  try {
    return await fs.readFile(srtFile, 'utf-8');
  } catch (e) {
    try {
      const dirname = path.dirname(srtFile);
      const basename = path.basename(srtFile, '.srt');

      return await fs.readFile(path.join(dirname, basename + `.${lang}.srt`), 'utf-8');
    } catch (e) {
      console.warn('Warning: ' + chalk.yellow(srtFile) + ' not found. Skipping...');
    }
  }
}

/**
 * Called as CLI
 *
 * Usage:
 *   ./processVideos.js --dir path/to/videos --skipExisting true --offset 1 -- path/to/gifs
 */
if (require && require.main === module) {
  const {
    '--': [output],
    dir,
    extensions,
    flatten,
    formats,
    lang,
    offset,
    sanitize,
    skipExisting,
  } = minimist(process.argv.slice(2), {
    string: ['dir', 'offset', 'extensions', 'lang', 'formats'],
    boolean: ['flatten', 'sanitize', 'skipExisting'],
    alias: {
      dir: 'd',
      extensions: 'x',
      flatten: 'f',
      lang: 'l',
      offset: 'o',
      formats: 'r',
      sanitize: 's',
      skipExisting: 'k',
    },
    'default': {
      extensions: '.mkv,.mp4,.m4v,.mov',
      formats: 'gif',
      lang: 'en',
    },
    unknown: false,
    '--': true,
  });

  const allowedExtensions = extensions.split(',');

  klaw(dir, {
    filter: (pth) => allowedExtensions.some((ext) => pth.endsWith(ext)),
  }).then(async ([dir, ...videos]) => {
    try {
      const t1 = new Date();

      for (const {path: vid} of videos) {
        await processVideo(path.resolve(process.cwd(), vid), output,
          {allowedExtensions, flatten, formats, lang, offset, sanitize, skipExisting});
      }

      console.info('Finished processing ' + chalk.green(videos.length) + ' videos in ' +
        moment().from(t1, true) + '\n');
    } catch (e) {
      console.error(chalk.red(e));
      process.exit(1);
    }
  });
}
