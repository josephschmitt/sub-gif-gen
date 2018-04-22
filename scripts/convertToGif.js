#!/usr/bin/env node -r esm

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import minimist from 'minimist';

import ffmpeg from '../lib/ffmpeg.js';
import {tmpl, cleanText, isDebugging} from '../lib/utils.js';

const FILTER = 'fps=10,scale=320:-1:flags=lanczos';
const FILTER_DRAWTEXT = tmpl`drawtext='text=${0}:fontsize=${1}:fontcolor=${2}:borderw=${3}:bordercolor=${4}:fix_bounds=true:x=(w-tw)/2:y=h-th-10-${5}'`;
const FILTER_SPLIT = '[x]split[x1][x2]';
const FILTER_PALETTE = '[x1]palettegen[p];[x2][p]paletteuse';

/**
 * Processes a portion of the input video into an animated looping gif.
 *
 * @param {String} input -- Path to the input video
 * @param {String} output -- Path to the output gif
 * @param {String|Number} startTime -- Start position in the video to start the gif
 * @param {String|Number} duration -- Duration of the gif
 * @param {String} text -- Optional subtitle text
 * @returns {Promise<String>} Resolves to a promise with the output path.
 */
export default async function convertToGif(input, output, startTime, duration, text) {
  await fs.ensureFile(output);

  let filter = FILTER;
  if (text) {
    filter += ',' + getCenteredMultilineDrawtext(text);
  }

  return ffmpeg(input, output, {
    ss: startTime,
    t: duration,
  }, {
    filter_complex: [].concat(filter + ' [x]', FILTER_SPLIT, FILTER_PALETTE).join(';'),
  });
}

/**
 * The drawtext ffmpeg filter has no way to center multiline text. This function loops through each
 * line and draws them horizontally centered in the frame line-by-line by setting multiple
 * consecutive drawtext filters.
 *
 * @param {String} text
 * @returns {String}
 */
function getCenteredMultilineDrawtext(text) {
  return cleanText(text).split(/\n/g).reverse().map((txt, i) => {
    return FILTER_DRAWTEXT(txt, 14, 'white', 2, 'black@0.6', (i * 16).toString());
  }).join(',') ;
}

/**
 * Called as CLI
 *
 * Usage:
 *   ./convertToGif.js --starttime 10 --duration 5 --text "I like gifs" \
 *     --input path/to/input.mkv -- path/to/out.gif
 */
if (require && require.main === module) {
  const {starttime, duration, input, '--': [output], text} = minimist(process.argv.slice(2), {
    string: ['starttime', 'duration', 'input', 'text'],
    alias: {
      starttime: 's',
      duration: 'd',
      input: 'i',
      text: 't',
    },
    '--': true,
    unknown: false,
  });

  const resolvedOutput = path.resolve(process.cwd(), output);
  const outputFile = path.join(resolvedOutput, path.basename(input, '.mkv') + '.gif');

  convertToGif(input, outputFile, starttime, duration, text).catch((e) => {
    console.error(chalk.red(e));
    process.exit(1);
  });
}
