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
      l.emit(lex.TokenType.Identifier);
  }

  return readSexp;
}

describe("Lexer", () => {
  it("should lex simple sexp correctly", () => {
    let input = " (+  foo 1)";
    testLexer(new lex.Lexer<lex.TokenType>(input, readSexp), [
      new lex.Token(lex.TokenType.LParen, "("),
      new lex.Token(lex.TokenType.Identifier, "+"),
      new lex.Token(lex.TokenType.Identifier, "foo"),
      new lex.Token(lex.TokenType.Identifier, "1"),
      new lex.Token(lex.TokenType.RParen, ")"),
    ]);
  });
});

describe("NadderLexer", () => {
  it("should lex symbols correctly", () => {
    let input = `=+-*/<>(),: == !=`;
    testLexer(new lex.NadderLexer(input), [
      new lex.Token(lex.TokenType.Assign, "="),
      new lex.Token(lex.TokenType.Plus, "+"),
      new lex.Token(lex.TokenType.Minus, "-"),
      new lex.Token(lex.TokenType.Asterisk, "*"),
      new lex.Token(lex.TokenType.Slash, "/"),
      new lex.Token(lex.TokenType.LT, "<"),
      new lex.Token(lex.TokenType.GT, ">"),
      new lex.Token(lex.TokenType.LParen, "("),
      new lex.Token(lex.TokenType.RParen, ")"),
      new lex.Token(lex.TokenType.Comma, ","),
      new lex.Token(lex.TokenType.Colon, ":"),
      new lex.Token(lex.TokenType.EQ, "=="),
      new lex.Token(lex.TokenType.NEQ, "!="),
    ]);
  });

  it("should lex ints, identifiers, and indents", () => {
    let input = `five = 5
ten = 10
add = lambda x, y: x + y

def add_10(x):
    return add(x, ten)

result = add_10(five)
`;

    testLexer(new lex.NadderLexer(input), [
      new lex.Token(lex.TokenType.Identifier, "five"),
      new lex.Token(lex.TokenType.Assign, "="),
      new lex.Token(lex.TokenType.Int, "5"),
      new lex.Token(lex.TokenType.Newline, "\n"),
      new lex.Token(lex.TokenType.Identifier, "ten"),
      new lex.Token(lex.TokenType.Assign, "="),
      new lex.Token(lex.TokenType.Int, "10"),
      new lex.Token(lex.TokenType.Newline, "\n"),
      new lex.Token(lex.TokenType.Identifier, "add"),
      new lex.Token(lex.TokenType.Assign, "="),
      new lex.Token(lex.TokenType.Lambda, "lambda"),
      new lex.Token(lex.TokenType.Identifier, "x"),
      new lex.Token(lex.TokenType.Comma, ","),
      new lex.Token(lex.TokenType.Identifier, "y"),
      new lex.Token(lex.TokenType.Colon, ":"),
      new lex.Token(lex.TokenType.Identifier, "x"),
      new lex.Token(lex.TokenType.Plus, "+"),
      new lex.Token(lex.TokenType.Identifier, "y"),
      new lex.Token(lex.TokenType.Newline, "\n"),
      new lex.Token(lex.TokenType.Def, "def"),
      new lex.Token(lex.TokenType.Identifier, "add_10"),
      new lex.Token(lex.TokenType.LParen, "("),
      new lex.Token(lex.TokenType.Identifier, "x"),
      new lex.Token(lex.TokenType.RParen, ")"),
      new lex.Token(lex.TokenType.Colon, ":"),
      new lex.Token(lex.TokenType.Newline, "\n"),
      new lex.Token(lex.TokenType.Indent, "    "),
      new lex.Token(lex.TokenType.Return, "return"),
      new lex.Token(lex.TokenType.Identifier, "add"),
      new lex.Token(lex.TokenType.LParen, "("),
      new lex.Token(lex.TokenType.Identifier, "x"),
      new lex.Token(lex.TokenType.Comma, ","),
      new lex.Token(lex.TokenType.Identifier, "ten"),
      new lex.Token(lex.TokenType.RParen, ")"),
      new lex.Token(lex.TokenType.Newline, "\n"),
      new lex.Token(lex.TokenType.Dedent, ""),
      new lex.Token(lex.TokenType.Identifier, "result"),
      new lex.Token(lex.TokenType.Assign, "="),
      new lex.Token(lex.TokenType.Identifier, "add_10"),
      new lex.Token(lex.TokenType.LParen, "("),
      new lex.Token(lex.TokenType.Identifier, "five"),
      new lex.Token(lex.TokenType.RParen, ")"),
      new lex.Token(lex.TokenType.Newline, "\n"),
    ]);
  });
});
