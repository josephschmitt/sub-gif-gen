import strip from 'strip';

const FILTER_DRAWTEXT = tmpl`drawtext='text=${0}:fontsize=${1}:fontcolor=${2}:borderw=${3}:bordercolor=${4}:fix_bounds=true:x=(w-tw)/2:y=h-th-10-((ascent+descent+${5})*${6})'`;

/**
 * Flattens an array of arrays.
 *
 * @param {Array} arr
 * @returns {Array}
 */
export function flatten(arr) {
  return [].concat.apply([], arr);
}

/**
 * Template literal tag function. Returns a function that can be called with parameters to build
 * a string response. The tagged template returns a function that you can then call with parameters
 * to build out yours tring.
 *
 * Usage:
 *   tmpl`This is ${0} reponse ${1} I made.`('an awesome', 'function')
 * Or:
 *   const respFnc = tmpl`This is ${0} reponse ${1} I made.`;
 *   respFnc('an awesome', 'function');
 *
 * Returns:
 *   'This is an awesome response function I made.'
 *
 * @param {Array} strs Array of strings from the template.
 * @returns {Function}
 */
export function tmpl(strs) {
  return (...args) => {
    return strs.map((str, i) => {
      return str + (args[i] || '');
    }).join('');
  };
}

/**
 * Cleans up input text so that it can be used in CLI as a param.
 *
 * @param {String} text
 * @returns {String}
 */
export function cleanText(text) {
  return strip(text).replace(/'/g, '\u2019').replace(/"/g, '');
}

export function isDebugging() {
  return process.env.LOGLEVEL && process.env.LOGLEVEL !== 'quiet';
}

/**
 * The drawtext ffmpeg filter has no way to center multiline text. This function loops through each
 * line and draws them horizontally centered in the frame line-by-line by setting multiple
 * consecutive drawtext filters.
 *
 * @param {String} text
 * @returns {String}
 */
export function getCenteredMultilineDrawtext(text) {
  return cleanText(text).split(/\n/g).reverse().map((txt, i) => {
    return FILTER_DRAWTEXT(txt, 16, 'white', 2, 'black@0.7', 10, i.toString());
  }).join(',') ;
}
