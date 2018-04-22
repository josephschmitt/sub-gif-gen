#!/usr/bin/env node -r esm

import fs from 'fs-extra';
import klaw from 'klaw-promise';
import minimist from 'minimist';
import path from 'path';
import parser from 'subtitles-parser';

import {convertTimeToTimestamp, convertTimestampToTime} from '../lib/converttime.js';

import applySubtitles from './applySubtitles.js';
import generateColorPalette from './generateColorPalette.js';
import convertToGif from './convertToGif.js';

const FILTERS = 'fps=15,scale=320:-1:flags=lanczos';

export default async function processVideo(input, output, {skipExisting}) {
  const dirname = path.dirname(input);
  const srt = path.basename(input, '.mkv') + '.srt';
  const subs = parser.fromSrt(await fs.readFile(path.join(dirname, srt), 'utf-8'));

  await fs.ensureDir(output);

  for (let {startTime, endTime, text} of subs) {
    startTime = startTime.replace(',', '.');
    endTime = endTime.replace(',', '.');

    const timestampMs = convertTimeToTimestamp(endTime) - convertTimeToTimestamp(startTime);
    const duration = convertTimestampToTime(timestampMs);
    const startTimeMs = convertTimeToTimestamp(startTime);

    try {
      const gifFilename = path.basename(input, '.mkv') + `-${startTimeMs}.gif`;
      const resolvedOutput = path.resolve(process.cwd(), output);
      const outputFile = path.join(resolvedOutput, gifFilename);
      const annotatedGifOutput = path.join(resolvedOutput, 'annotated', gifFilename);

      if (skipExisting && await (fs.pathExists(outputFile)) &&
          await (fs.pathExists(annotatedGifOutput))) {
        continue;
      }

      const gifOutput = await convertToGif(input, outputFile, startTime, duration);
      await applySubtitles(gifOutput, annotatedGifOutput, `${text}`);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  }
}

// Called as CLI
if (require && require.main === module) {
  const {dir, output, skipExisting} = minimist(process.argv.slice(2), {
    string: ['dir', 'output', 'skipExisting'],
    alias: {
      dir: 'd',
      output: 'o',
      skipExisting: 's',
    },
    unknown: false,
  });

  klaw(dir).then(async (videos) => {
    videos = videos.map(({path}) => path).filter((vid) => /\.mkv$/.test(vid))

    for (const vid of videos) {
      await processVideo(path.resolve(process.cwd(), vid), output, {skipExisting});
    }
  });
}
