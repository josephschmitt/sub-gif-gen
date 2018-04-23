#!/usr/bin/env node -r esm

import chalk from 'chalk';
import fs from 'fs-extra';
import klaw from 'klaw-promise';
import minimist from 'minimist';
import moment from 'moment';
import path from 'path';
import parser from 'subtitles-parser';

import {convertTimeToTimestamp} from '../lib/converttime.js';

import convertToGif from './convertToGif.js';

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
    {skipExisting, offset, allowedExtensions}) {
  const t1 = new Date();

  const dirname = path.dirname(input);
  const basename = allowedExtensions.reduce((val, cur) => path.basename(val, cur), input);
  const srt = basename + '.srt';
  const subs = parser.fromSrt(await fs.readFile(path.join(dirname, srt), 'utf-8'));

  console.info(chalk.green('Processing'), path.basename(input) + chalk.gray('...'));

  for (const sub of subs) {
    let {startTime, endTime, text} = sub;

    let startTimeMs = convertTimeToTimestamp(startTime.replace(',', '.'));
    let durationMs = convertTimeToTimestamp(endTime.replace(',', '.')) - startTimeMs;

    const gifFilename = basename + `-${startTimeMs}.gif`;
    const outputDir = path.resolve(process.cwd(), output, basename);
    const outputFile = path.resolve(outputDir, gifFilename);

    await fs.ensureDir(outputDir);

    if (skipExisting && await (fs.pathExists(outputFile))) {
      continue;
    }

    const seekTo = Math.max(0, startTimeMs / 1000 - (offset || 0));
    const duration = durationMs / 1000 + (offset || 0) * 2;

    const gifOutput = await convertToGif(input, outputFile, seekTo, duration, text);
    sub.id = basename + '-' + startTimeMs;
    sub.name = basename;

    // Format times by removing commas and re-moving leading hour mark until necessary
    const startTimeFmt = startTime.replace(',', '.').replace('00:', '');
    const endTimeFmt = endTime.replace(',', '.').replace('00:', '');
    const size = (await fs.stat(gifOutput)).size / 1000000;

    console.info(`  ${chalk.cyan(startTimeFmt) + chalk.gray('-') + chalk.cyan(endTimeFmt)}:`,
        text.replace(/\n/g, ' '), chalk.gray(`[${size.toFixed(2)}MB]`));
  }

  await fs.outputJson(path.resolve(process.cwd(), output, basename + '.index.json'), subs);

  console.info('Finished generating ' + chalk.green(subs.length) + ' gifs in ' +
      moment().from(t1, true) + '\n');
}

/**
 * Called as CLI
 *
 * Usage:
 *   ./processVideos.js --dir path/to/videos --skipExisting true --offset 1 -- path/to/gifs
 */
if (require && require.main === module) {
  const {
    dir,
    '--': [output],
    skipExisting,
    offset,
    extensions
  } = minimist(process.argv.slice(2), {
    string: ['dir', 'offset', 'extensions'],
    boolean: ['skipExisting'],
    alias: {
      dir: 'd',
      skipExisting: 's',
      offset: 'o',
      extensions: 'x',
    },
    'default': {
      extensions: '.mkv,.mp4',
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
          {skipExisting, offset, allowedExtensions});
      }

      console.info('Finished processing ' + chalk.green(videos.length) + ' videos in ' +
        moment().from(t1, true) + '\n');
    } catch (e) {
      console.error(chalk.red(e));
      process.exit(1);
    }
  });
}
