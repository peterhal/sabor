/* @flow */

import {parseFile} from './parse';
import {VISITOR_KEYS} from 'babel-types';
import path from 'path';
import resolve from 'resolve';

import type {Edge} from './types';

function* childrenOf(node: ?Object): Iterator<Object> {
  if (node != null) {
    for (const key of VISITOR_KEYS[node.type]) {
      const child = node[key];
      if (Array.isArray(child)) {
        yield* child;
      } else {
        yield child;
      }
    }
  }
}

function traverse(node: ?Object, visit: (element: Object) => boolean): void {
  if (node != null && visit(node)) {
    for (const child of childrenOf(node)) {
      traverse(child, visit);
    }
  }
}

function isIdentifier(node: Object, id: string): boolean {
  return node.type === 'Identifier' && node.name === id;
}

function findRequires(node: ?Object): Array<Object> {
  const result = [];
  traverse(node, child => {
    if (child.type === 'CallExpression'
        && isIdentifier(child.callee, 'require')
        && child.arguments.length === 1
        && child.arguments[0].type === 'StringLiteral') {
      result.push(child);
    }
    return true;
  });
  return result;
}

function findImports(node: ?Object): Array<Object> {
  const result = [];
  traverse(node, child => {
    if (child.type === 'ImportDeclaration' &&
        child.importKind !== 'type') {
      result.push(child);
    }
    return true;
  });
  return result;
}

function requireValue(require: Object): string {
  return require.arguments[0].value;
}

function importValue(imp: Object): string {
  return imp.source.value;
}

function isRelativeModule(moduleName: string): boolean {
  return moduleName.startsWith('.') &&
      // require can be used to load json files. Urk!
      !moduleName.endsWith('.json');
}

function requireToEdge(fileName: string, require: Object): Edge {
  return {
    start: fileName,
    end: requireValue(require),
    location: require.loc,
  };
}

function importToEdge(fileName: string, imp: Object): Edge {
  return {
    start: fileName,
    end: importValue(imp),
    location: imp.loc,
  };
}

function relativizeEdges(edges: Array<Edge>): Array<Edge> {
  return edges.
    filter(edge => isRelativeModule(edge.end)).
    map(edge => ({
      start: edge.start,
      end: resolve.sync(edge.end, {basedir: path.dirname(edge.start)}),
      location: edge.location,
    }));
}

// Takes a fully qualified file name, finds all imports and requires
// which are relative paths and converts them to Edges.
export default function fileToEdges(fileName: string): Array<Edge> {
  const tree = parseFile(fileName);
  const allRequires =
      findRequires(tree).map(require => requireToEdge(fileName, require));
  Array.prototype.push.apply(
    allRequires,
    findImports(tree).map(imp => importToEdge(fileName, imp)));
  return relativizeEdges(allRequires);
}
