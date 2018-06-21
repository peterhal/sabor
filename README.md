Sabor
-----

Detects cycles in imports/require statements in a set of JS files.
Takes a list of JS files as arguments on the command line.
Will add any relatively imported/required JS files to the set of files to analyze.
Reports the list of cycles found.

Exits with status 1 if cycles are found, otherwise exits with 0 if no
cycles are found.

For Example to run sabor on itself:

```
node index.js index.js
```

Yields:

```
No cycles found in 4 files.
```

Development
-----------

To Build:

```
npm run build
```

Run lint before submitting a PR:

```
npm run-script lint
```
