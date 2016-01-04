'use babel';
/* @flow */

export type Location = {
  line: number;
  column: number;
};

export type Span = {
  start: Location;
  end: Location;
};

export type Edge = {
  start: string;
  end: string;
  location: Span;
};
