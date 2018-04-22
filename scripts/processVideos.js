#!/usr/bin/env node -r esm

import fs from 'fs-extra';
import klaw from 'klaw-promise';
import minimist from 'minimist';
import path from 'path';
import parser from 'subtitles-parser';

import {convertTimeToTimestamp, convertTimestampToTime} from '../lib/converttime.js';

import convertToGif from './convertToGif.js';

const FILTERS = 'fps=15,scale=320:-1:flags=lanczos';
const SUPPORTED_MOVIES = ['.mkv'];
const SUPPORTED_SUBS = ['.srt'];

/**
 * Converts a single video into multiple animated gifs, each gif mapping to a section of the video's
 * subtitles.
 *
 * @param {String} input -- Path to the input video
 * @param {String} output -- Path to output the gif to
 * @param {Object} options
 * @param {Boolean} options.skipExisting -- If true, will skip a section if the output gif exists
 * @param {Number} options.offset -- Padding to apply to the start/end points of the clip section
 */
export default async function processVideo(input, output, {skipExisting, offset}) {
  const dirname = path.dirname(input);
  const basename = path.basename(input, '.mkv');
  const srt = basename + '.srt';
  const subs = parser.fromSrt(await fs.readFile(path.join(dirname, srt), 'utf-8'));

  for (let {startTime, endTime, text} of subs) {
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
  }
}

/**
 * Called as CLI
 *
 * Usage:
 *   ./processVideos.js --dir path/to/videos --skipExisting true --offset 1 -- path/to/gifs
 */
if (require && require.main === module) {
  const {dir, '--': [output], skipExisting, offset} = minimist(process.argv.slice(2), {
    string: ['dir', 'skipExisting', 'offset'],
    alias: {
      dir: 'd',
      skipExisting: 's',
      offset: 'o',
    },
    unknown: false,
    '--': true,
  });

  klaw(dir).then(async (videos) => {
    videos = videos.map(({path}) => path).filter((vid) => /\.mkv$/.test(vid))

    try {
      for (const vid of videos) {
        await processVideo(path.resolve(process.cwd(), vid), output, {skipExisting, offset});
      }
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  });
}
