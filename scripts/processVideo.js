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

export default async function processVideo(input, output, {skipExisting, offset}) {
  const dirname = path.dirname(input);
  const srt = path.basename(input, '.mkv') + '.srt';
  const subs = parser.fromSrt(await fs.readFile(path.join(dirname, srt), 'utf-8'));

  await fs.ensureDir(output);

  for (let {startTime, endTime, text} of subs) {
    let startTimeMs = convertTimeToTimestamp(startTime.replace(',', '.'));
    let durationMs = convertTimeToTimestamp(endTime.replace(',', '.')) - startTimeMs;

    const gifFilename = path.basename(input, '.mkv') + `-${startTimeMs}.gif`;
    const resolvedOutput = path.resolve(process.cwd(), output);
    const outputFile = path.join(resolvedOutput, 'gif', gifFilename);
    const annotatedGifOutput = path.join(resolvedOutput, 'annotated', gifFilename);

    if (skipExisting && await (fs.pathExists(outputFile)) &&
        await (fs.pathExists(annotatedGifOutput))) {
      continue;
    }

    const seekTo = Math.max(0, startTimeMs / 1000 - (offset || 0));
    const duration = durationMs / 1000 + (offset || 0) * 2;

    const gifOutput = await convertToGif(input, outputFile, seekTo, duration);
    await applySubtitles(gifOutput, annotatedGifOutput, `${text}`);
  }
}

// Called as CLI
if (require && require.main === module) {
  const {dir, output, skipExisting, offset} = minimist(process.argv.slice(2), {
    string: ['dir', 'output', 'skipExisting', 'offset'],
    alias: {
      dir: 'd',
      output: 'o',
      skipExisting: 's',
      offset: 'to',
    },
    unknown: false,
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
