import {spawn} from 'child_process';

import {flatten} from './utils.js';

/**
 * JavaScript wrapper for the ffmpeg binary.
 *
 * @param {String|Array<String>} input -- Path or array of paths to provide as inputs
 * @param {String} output -- Output file path
 * @param {Object} inputOptions
 * @param {Object} outputOptions
 * @returns {Promise<String>} Promise resolving to the output file path
 */
export default function ffmpeg(input, output, inputOptions = {}, outputOptions = {}) {
  const inputOpt = Object.entries(inputOptions).map(formatOptAsArgs);
  inputOpt.splice(inputOpt.length, 0,
      Array.isArray(input) ? flatten(input.map(wrapInput)) : wrapInput(input));

  const outputOpt = Object.entries(outputOptions).map(formatOptAsArgs);
  outputOpt.push(['-y', output]);

  if (process.env.DEBUG === 'true') {
    console.log('\n ffmpeg', flatten(inputOpt.concat(outputOpt)).join(' '), '\n');
  }

  const ffmpegBin = process.env.FFMPEG_BIN || 'ffmpeg';
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegBin, flatten(inputOpt.concat(outputOpt)), {stdio: 'inherit'});
    proc.on('error', reject);
    proc.on('exit', () => resolve(output));
    proc.on('close', () => resolve(output));
  });
}

/**
 * Formats key/val pairs for the child_process by adding a `-` to the front of the key
 *
 * @param {Array} keyVal -- Array of key/value pairs
 */
function formatOptAsArgs([arg, value]) {
  return [`-${arg}`, value];
}

function wrapInput(inp) {
  return ['-i', inp];
}
