#!/usr/bin/env node -r esm

import fs from 'fs-extra';
import imagemagick from 'imagemagick-cli';

import {flatten} from '../lib/utils.js';

const options = [
  ['-gravity', 'south'],
  ['-font', 'Helvetica'],
  ['-pointsize', 14],
];

const strokeOpt = [
  ['-stroke', '\'#000C\''],
  ['-strokewidth', 3],
  ['-annotate', 0],
];

const fillOpt = [
  ['-stroke', 'none'],
  ['-fill', 'white'],
  ['-annotate', 0],
];

export default async function applySubtitles(input, output, text) {
  await fs.ensureFile(output);

  return imagemagick.exec(`convert ${input} ` +
    `${flatten(options).join(' ')} ` +
    `${flatten(strokeOpt).join(' ')} '"${text}"' ` +
    `${flatten(fillOpt).join(' ')} '"${text}"' ` +
    output
  );
}

// Called as CLI
if (require && require.main === module) {
  const sources = [];
  const {text, output} = minimist(process.argv.slice(2), {
    string: ['text', 'output'],
    alias: {
      text: 't',
      output: 'o',
    },
    unknown: (src) => sources.push(src) && false,
  });

  Promise.all(sources.map((src) => {
    const resolvedOutput = path.resolve(process.cwd(), output);
    const outputFile = path.join(resolvedOutput, path.basename(src));

    return applySubtitles(src, outputFile);
  }));
}
