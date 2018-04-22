#!/usr/bin/env node -r esm

import fs from 'fs-extra';
import path from 'path';
import minimist from 'minimist';

import ffmpeg from '../lib/ffmpeg.js';

import applySubtitles from './applySubtitles.js';
import generateColorPalette from './generateColorPalette.js';

const FILTERS = 'fps=15,scale=320:-1:flags=lanczos';
const FILTER_COMPLEX = 'fps=10,scale=320:-1:flags=lanczos[x];[x]split[x1][x2]; [x1]palettegen[p];[x2][p]paletteuse';

export default async function convertToGif(input, output, startTime, duration) {
  await fs.ensureFile(output);

  return ffmpeg(input, output, {
    ss: startTime,
    t: duration,
  }, {
    filter_complex: FILTER_COMPLEX,
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

  Promise.all(sources.map((src) => {
    const resolvedOutput = path.resolve(process.cwd(), output);
    const outputFile = path.join(resolvedOutput, path.basename(src, '.mkv') + '.gif');

    return convertToGif([src, palette], outputFile, starttime, duration);
  }));
}
