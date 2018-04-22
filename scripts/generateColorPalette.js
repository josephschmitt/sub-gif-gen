#!/usr/bin/env node -r esm

import fs from 'fs-extra';
import minimist from 'minimist';
import path from 'path';

import ffmpeg from '../lib/ffmpeg.js';

const FILTERS = 'fps=15,scale=320:-1:flags=lanczos';
const PALETTE_OUTPUT = 'tmp/palette.png';

export default async function generateColorPalette(input, startTime, duration) {
  const output = path.resolve(process.cwd(), PALETTE_OUTPUT);
  await fs.ensureFile(output);

  return ffmpeg(input, output, {
    v: 'warning',
    ss: startTime,
    t: duration,
  }, {
    vf: `${FILTERS},palettegen`,
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

  Promise.all(sources.map((src) => generateColorPalette(src, starttime, duration)))
}
