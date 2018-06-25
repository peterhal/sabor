/* @flow */

import invariant from 'assert';
import fileToEdges from './file';
import yargs from 'yargs';

import type {Edge} from './types';


type Node = {
  file: string;
  // Map from destination to edge
  edges: Map<Node, Edge>;
};

function buildGraph(rootFiles: Array<string>): Map<string, Node> {
  const nodes: Map<string, Node> = new Map();
  const toProcess = [];

  function ensureNode(file: string, from: ?string): Node {
    if (!nodes.has(file)) {
      if (args.verbose && from != null) {
        process.stdout.write(`Adding file ${file} referenced from ${from}\n`);
      }
      const result = {
        file,
        edges: new Map(),
      };
      nodes.set(file, result);
      toProcess.push(file);
      return result;
    } else {
      const result = nodes.get(file);
      invariant(result != null);
      return result;
    }
  }

  rootFiles.forEach(file => ensureNode(file, null));

  while (toProcess.length > 0) {
    const fileName = toProcess.pop();
    const startNode = nodes.get(fileName);
    invariant(startNode);
    const edges = fileToEdges(fileName, args.types);
    edges.forEach(edge => {
      const endNode = ensureNode(edge.end, fileName);
      // Here we are discarding duplicate edges
      if (!startNode.edges.has(endNode)) {
        startNode.edges.set(endNode, edge);
      }
    });
  }
  return nodes;
}

// Use Tarjan's Algorithm to find Strongly connected components
// https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm
function findCycles(graph: Iterable<Node>): Array<Array<Node>> {
  let index = 0;
  const stack: Array<Node> = [];
  const inProgress: Set<Node> = new Set();
  const indexes: Map<Node, number> = new Map();
  const lowest: Map<Node, number> = new Map();
  const result = [];

  for (const node of graph) {
    if (!inProgress.has(node)) {
      tarjans(node);
    }
  }

  function tarjans(node: Node): void {
    inProgress.add(node);
    indexes.set(node, index);
    lowest.set(node, index);
    index++;
    stack.push(node);

    node.edges.forEach((edge, end) => {
      const nodeLowest = lowest.get(node);
      invariant(nodeLowest != null);
      if (!indexes.has(end)) {
        tarjans(end);
        const endLowest = lowest.get(end);
        invariant(endLowest != null);
        lowest.set(
          node,
          Math.min(nodeLowest, endLowest));
      } else if (inProgress.has(end)) {
        const nodeIndex = indexes.get(end);
        invariant(nodeIndex != null);
        lowest.set(
          node,
          Math.min(nodeLowest, nodeIndex));
      }
    });

    if (lowest.get(node) === indexes.get(node)) {
      const component: Array<Node> = [];
      let member;
      do {
        member = stack.pop();
        inProgress.delete(member);
        component.push(member);
      } while (member !== node);
      result.push(component);
    }
  }

  return result;
}

function findSmallestCycles(components: Array<Array<Node>>): Array<Array<Node>> {
  // Find the/a shortest cycle (of which one is guaranteed) in the given
  // set of nodes, which includes the given starting node
  function breadthFirstSearch(node: Node, candidateNodes: Set<Node>): Array<Node> {
    const from: Map<Node, Node> = new Map();
    const toProcess: Array<Node> = [];

    function queueConnectedNodes(start: Node): void {
      start.edges.forEach((edge, end) => {
        if (!from.has(end) && candidateNodes.has(end)) {
          from.set(end, start);
          toProcess.push(end);
        }
      });
    }

    function reconstuctPathFrom(startNode: Node): Array<Node> {
      let pathNode: Node = startNode;

      const path: Array<Node> = [];
      do {
        path.push(pathNode);
        pathNode = from.get(pathNode);
      } while (pathNode !== startNode);

      return path;
    }

    queueConnectedNodes(node);

    while (toProcess.length !== 0) {
      const candidate = toProcess.shift();
      queueConnectedNodes(candidate);
    }

    invariant(from.has(node));
    return reconstuctPathFrom(node);
  }

  const cycles: Array<Array<Node>> = [];

  // For each strongly connected component, find the shortest cycle containing
  // each node in the component.
  components
    .filter(component => component.length > 1)
    .forEach(component => {
      const nodesInComponent: Set<Node> = new Set(component);
      Array.prototype.push.apply(
        cycles, component.map(node => breadthFirstSearch(node, nodesInComponent)));
    });

  cycles.sort((a, b) => a.length - b.length);

  // Filter out duplicate cycles (i.e. cycles that contain nodes that have
  // already been seen in another cycle.) Since we consider these in sorted
  // order, we'll end up with the shortest cycle that contains each node
  // in the output.
  const seenNodes: Set<Node> = new Set();

  function hasUnseenNodes(cycle: Array<Node>): boolean {
    return cycle.reduce((accum, node) => accum || !seenNodes.has(node), false);
  }

  function markNodesSeen(cycle: Array<Node>): void {
    cycle.forEach(node => {
      seenNodes.add(node);
    });
  }

  const minimalCycles: Array<Array<Node>> = [];

  cycles.forEach(cycle => {
    if (hasUnseenNodes(cycle)) {
      minimalCycles.push(cycle);
      markNodesSeen(cycle);
    }
  });

  return minimalCycles;
}

function printGraph(graph: Map<string, Node>): void {
  process.stdout.write(`Found ${graph.size} files\n`);
  for (const node of graph.values()) {
    process.stdout.write(`File: ${node.file}, Edges ${node.edges.size}\n`);
  }
}

const args = yargs
  .option('verbose', {
    type: 'boolean',
    default: false,
    description: 'Show verbose output while parsing',
  }).option('types', {
    type: 'boolean',
    default: false,
    description: 'Check for cycles caused by type imports as well as normal requires and imports',
  }).argv;

const rootFiles = args._;
const graph = buildGraph(rootFiles);
if (args.verbose) {
  printGraph(graph);
}
const cycles = findSmallestCycles(findCycles(graph.values())).
    filter(cycle => cycle.length > 1).
    map(cycle => cycle.map(node => node.file).sort((a, b) => a.localeCompare(b)));
if (cycles.length > 0) {
  process.stderr.write('Found cycles:\n');
  process.stderr.write(JSON.stringify(cycles, null, 4));
  process.stderr.write('\n');
  process.exit(1);
} else {
  process.stdout.write(`No cycles found in ${graph.size} files.\n`);
}
