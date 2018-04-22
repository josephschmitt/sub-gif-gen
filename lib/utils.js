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
  return text.replace(/'/g, '\u2019').replace(/"/g, '');
}

export function isDebugging() {
  return process.env.LOGLEVEL && process.env.LOGLEVEL !== 'quiet';
}
