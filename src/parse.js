/* @flow */

import * as babylon from 'babylon';
import fs from 'fs';

const parserConfig = {
  // parse in strict mode and allow module declarations
  sourceType: 'module',

  parserOpts: {
    plugins: [
      'classProperties',
      'flow',
      'jsx',
      'objectRestSpread',
    ],
  },

  plugins: [
    'classProperties',
    'flow',
    'jsx',
    'objectRestSpread',
  ],
};

export function parse(code: string): Object {
  return babylon.parse(code, parserConfig);
}

export function parseFile(fileName: string): Object {
  try {
    return parse(fs.readFileSync(fileName, 'utf8'));
  } catch (e) {
    const message = `Error parsing ${fileName}: ${e.message}\n`;
    process.stderr.write(message);
    e.message = message;
    throw e;
  }
}
