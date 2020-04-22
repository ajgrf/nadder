// Copyright (c) 2020, Alex Griffin <a@ajgrf.com>
//
// Use of this source code is governed by an ISC-style
// license that can be found in the LICENSE file.

import assert from "assert";
import lex = require("../src/lex");

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

let expectedTokens: lex.Token<lex.TokenTag<lex.TokenType>>[] = [
  new lex.Token(lex.TokenType.LParen, "("),
  new lex.Token(lex.TokenType.Ident, "+"),
  new lex.Token(lex.TokenType.Ident, "foo"),
  new lex.Token(lex.TokenType.Ident, "1"),
  new lex.Token(lex.TokenType.RParen, ")"),
  new lex.Token("EOF", ""),
];

describe("Lexer", () => {
  it("should lex simple sexp correctly", () => {
    let input = " (+  foo 1)";
    let lexer = new lex.Lexer<lex.TokenType>(input, readSexp);
    for (let i = 0; i < expectedTokens.length; i++) {
      let tok = lexer.nextToken();
      assert.deepStrictEqual(tok, expectedTokens[i]);
    }
    assert.throws(lexer.nextToken);
  });
});
