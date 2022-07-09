<h1>NodeJS Cli Starting Point.</h1>

- a fully functional tiny example program that sort and unique file-lines.
- a starting point for NodeJS client program, that normalizes a lot of Windows CMD quirks.
- comes with a launcher batch-file that handles Unicode, exit code, and any amount of arguments.
- no dependencies.

<hr/>

- parse `--` switches very easily.
- an optional debug mode to show additional information (controlled by `--verbose`).
- filter out `node.exe`, and the main module from the list of arguments.
- sample `--help` action that does not start the actual script but instead show some information and quits.
- checking file access, file information (modified, created, accessed, size, ..), and reading file's content in a way that works on Windows too.
- `10`-seconds maximum read/write time using newly added static `AbortSignal.timeout` that does not need `setTimeout` and any wrappers. a good practice to prevent hanging.
- generic natural sort algorithm `1<2<10<20` (instead of normal sort `1<10<2<20`) that handles localization and Unicode with ease (pretty nice, even-though this is not the point of the script..).
- explicit exit code handling for maximum compatiblity with other programs.
- favoring sync code (you can easily use async and await and remove the `Sync` suffix of all the functions used).
- tiny and easy to understand.
- pretty generic, clone/fork/copy and you have a starting point for your-own script.
