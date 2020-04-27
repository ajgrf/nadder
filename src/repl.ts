// Copyright (c) 2020, Alex Griffin <a@ajgrf.com>
//
// Use of this source code is governed by an ISC-style
// license that can be found in the LICENSE file.

import * as lex from "./lex";
import * as readline from "readline";
import * as util from "util";

const primaryPrompt = ">>> ";
const secondaryPrompt = "... ";

/** Start a Nadder REPL with the given input and output streams. */
export function start(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream
) {
  const rl = readline.createInterface({ input, output, terminal: false });

  // Store previous input here when a continuation line is needed
  let prevLines = "";

  rl.setPrompt(primaryPrompt);
  rl.prompt();
  rl.on("line", (line) => {
    let input = prevLines + line + "\n";
    // Check if input is fit to eval.
    if (isComplete(line)) {
      // Eval, print, and reset previous input.
      output.write(print(evaluate(input)));
      prevLines = "";
      rl.setPrompt(primaryPrompt);
    } else {
      // Read another line before evaluating.
      prevLines = input + "\n";
      rl.setPrompt(secondaryPrompt);
    }
    rl.prompt();
  });

  rl.on("close", () => {
    output.write("\n");
  });
}

/**
 * Returns whether `input` is complete enough to evaluate.  Only checks
 * if `input` is indented or ends in a colon.
 */
function isComplete(input: string): boolean {
  let tokens = Array.from(lex.tokenize(input));
  if (tokens.length === 0) {
    return true;
  } else {
    let lastToken = tokens[tokens.length - 1];
    return (
      tokens[0].type !== lex.TokenType.Indent &&
      lastToken.type !== lex.TokenType.Colon
    );
  }
}

/** Only tokenizes `input` for now. */
function evaluate(input: string): Iterable<lex.Token<lex.TokenType>> {
  return lex.tokenize(input);
}

/** Print result of `evaluate()`. */
function print(tokens: Iterable<lex.Token<lex.TokenType>>): string {
  let s: string = "";
  for (const tok of tokens) {
    if (tok.type === "Illegal") {
      s += "error: " + tok.value;
    } else {
      s += util.format("%O", {
        value: tok.value,
        type: lex.TokenType[tok.type as number],
      });
    }
    s += "\n";
  }
  return s;
}
