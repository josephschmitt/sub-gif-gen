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

const {generate: safeString} = new UrlSafeString();

/**
 * Converts a single video into multiple animated gifs, each gif mapping to a section of the video's
 * subtitles.
 *
 * @param {String} input -- Path to the input video
 * @param {String} output -- Path to output the gif to
 * @param {Object} options
 * @param {Boolean} options.skipExisting -- If true, will skip a section if the output gif exists
 * @param {Number} options.offset -- Padding to apply to the start/end points of the clip section
 * @param {Array<String>} allowedExtensions -- Array of extensions allowed for input videos
 */
export default async function processVideo(input, output,
    {allowedExtensions, flatten, lang, offset, sanitize, skipExisting}) {
  const t1 = new Date();

  const dirname = path.dirname(input);
  const basename = allowedExtensions.reduce((val, cur) => path.basename(val, cur), input);
  const sanitizedName = sanitize ? safeString(basename) : basename;
  const srtFile = path.join(dirname, basename + '.srt');

  const srtContents = await resolveSrtFile(srtFile, lang);
  if (!srtContents) {
    return;
  }

  const subs = parser.fromSrt(srtContents);

  console.info(chalk.green('Processing'), path.basename(input) + chalk.gray('...'));

  for (const sub of subs) {
    let {startTime, endTime, text} = sub;

    let startTimeMs = convertTimeToTimestamp(startTime.replace(',', '.'));
    let durationMs = convertTimeToTimestamp(endTime.replace(',', '.')) - startTimeMs;

    const gifFilename = sanitizedName + `-${startTimeMs}.gif`;
    const outputDir = path.resolve(process.cwd(), output, (flatten ? '' : basename));
    const outputFile = path.resolve(outputDir, gifFilename);

    sub.id = sanitizedName + '-' + startTimeMs;
    sub.name = sanitizedName;

    await fs.ensureDir(outputDir);

    if (skipExisting && await fs.pathExists(outputFile)) {
      continue;
    }

    const seekTo = Math.max(0, startTimeMs / 1000 - (offset || 0));
    const duration = durationMs / 1000 + (offset || 0) * 2;

    const gifOutput = await convertToGif(input, outputFile, seekTo, duration, text);

    // Format times by removing commas and re-moving leading hour mark until necessary
    const startTimeFmt = startTime.replace(',', '.').replace('00:', '');
    const endTimeFmt = endTime.replace(',', '.').replace('00:', '');
    const size = (await fs.stat(gifOutput)).size / 1000000;

    console.info(`  ${chalk.cyan(startTimeFmt) + chalk.gray('-') + chalk.cyan(endTimeFmt)}:`,
        cleanText(text).replace(/\n/g, ' '), chalk.gray(`[${size.toFixed(2)}MB]`));
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
    lang,
    offset,
    sanitize,
    skipExisting,
  } = minimist(process.argv.slice(2), {
    string: ['dir', 'offset', 'extensions', 'lang'],
    boolean: ['flatten', 'sanitize', 'skipExisting'],
    alias: {
      dir: 'd',
      extensions: 'x',
      flatten: 'f',
      lang: 'l',
      offset: 'o',
      sanitize: 's',
      skipExisting: 'k',
    },
    'default': {
      extensions: '.mkv,.mp4,.mv4,.mov',
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
          {allowedExtensions, flatten, lang, offset, sanitize, skipExisting});
      }

      console.info('Finished processing ' + chalk.green(videos.length) + ' videos in ' +
        moment().from(t1, true) + '\n');
    } catch (e) {
      console.error(chalk.red(e));
      process.exit(1);
    }
  });
}
