/* @flow */

import * as babylon from 'babylon';
import fs from 'fs';

const parserConfig = {
  // parse in strict mode and allow module declarations
  sourceType: 'module',

  plugins: [
    // enable experimental async functions
    'asyncFunctions',

    // stage 3
    'asyncGenerators',
    'exponentiationOperator',

    // stage 2
    'trailingFunctionCommas',
    'objectRestSpread',

    // stage 1
    'classConstructorCall',
    'classProperties',
    'exportExtensions',
    'decorators',

    // stage 0
    'doExpressions',
    'functionBind',

    // enable jsx and flow syntax
    'jsx',
    'flow',
  ],
};

export function parse(code: string): Object {
  return babylon.parse(code, parserConfig);
}

export function parseFile(fileName: string): Object {
  try {
    return parse(fs.readFileSync(fileName, 'utf8'));
  } catch (e) {
    process.stderr.write(`Error parsing ${fileName}\n`);
    throw e;
  }
}
