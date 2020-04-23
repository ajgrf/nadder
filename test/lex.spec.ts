// Copyright (c) 2020, Alex Griffin <a@ajgrf.com>
//
// Use of this source code is governed by an ISC-style
// license that can be found in the LICENSE file.

import assert from "assert";
import lex = require("../src/lex");

/** Test the tokens emitted by `lexer` against `expected` tokens. */
function testLexer<T>(lexer: Iterable<lex.Token<T>>, expected: lex.Token<T>[]) {
  let actual = Array.from(lexer);
  assert.deepStrictEqual(actual, expected);
}

/** Tokenize simplified s-expressions. */
function readSexp(l: lex.Lexer<lex.TokenType>): lex.StateFn<lex.TokenType> {
  let char = l.nextChar();
  switch (char) {
    case " ":
      l.ignore();
      break;
    case "(":
      l.emit(lex.TokenType.LParen);
      break;
    case ")":
      l.emit(lex.TokenType.RParen);
      break;
    case lex.eof:
      l.emit("EOF");
      return undefined;
    default:
      l.acceptRun(lex.alphanumeric + "'+-*/?!");
      l.emit(lex.TokenType.Ident);
  }

  return readSexp;
}

describe("Lexer", () => {
  it("should lex simple sexp correctly", () => {
    let input = " (+  foo 1)";
    testLexer(new lex.Lexer<lex.TokenType>(input, readSexp), [
      new lex.Token(lex.TokenType.LParen, "("),
      new lex.Token(lex.TokenType.Ident, "+"),
      new lex.Token(lex.TokenType.Ident, "foo"),
      new lex.Token(lex.TokenType.Ident, "1"),
      new lex.Token(lex.TokenType.RParen, ")"),
    ]);
  });
});
