#!/usr/bin/env node -r esm

import fs from 'fs-extra';
import path from 'path';
import minimist from 'minimist';

import ffmpeg from '../lib/ffmpeg.js';

import applySubtitles from './applySubtitles.js';
import generateColorPalette from './generateColorPalette.js';

const FILTERS = 'fps=15,scale=320:-1:flags=lanczos';

export default async function processVideo(input, output, startTime, duration) {
  await fs.ensureFile(output);

  return ffmpeg(input, output, {
    v: 'warning',
    ss: startTime,
    t: duration,
  }, {
    lavfi: `${FILTERS} [x]; [x][1:v] paletteuse`
  });
}

// Called as CLI
if (require && require.main === module) {
  const sources = [];
  const {starttime, duration, output} = minimist(process.argv.slice(2), {
    string: ['starttime', 'duration', 'output'],
    alias: {
      starttime: 's',
      duration: 'd',
      output: 'o',
    },
    unknown: (src) => sources.push(src) && false,
  });

  Promise.all(sources.map(async (src) => {
    const palette = await generateColorPalette(src, starttime, duration);

    const resolvedOutput = path.resolve(process.cwd(), output);
    const outputFile = path.join(resolvedOutput, path.basename(src, '.mkv') + '.gif');

    const gif = await processVideo([src, palette], outputFile, starttime, duration);
    await applySubtitles(gif, path.join(path.join(resolvedOutput, 'annotated', path.basename(src, '.mkv') + '.gif')), 'Some text here');
  }));
}
