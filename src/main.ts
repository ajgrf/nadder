// Copyright (c) 2020, Alex Griffin <a@ajgrf.com>
//
// Use of this source code is governed by an ISC-style
// license that can be found in the LICENSE file.

import * as repl from "./repl";

function main() {
  repl.start(process.stdin, process.stdout);
}

if (require.main === module) {
  main();
}
