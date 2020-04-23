// Copyright (c) 2020, Alex Griffin <a@ajgrf.com>
//
// Use of this source code is governed by an ISC-style
// license that can be found in the LICENSE file.

import assert from "assert";
import * as lex from "../src/lex";
import { Token, TokenType } from "../src/lex";

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
      l.emit(TokenType.LParen);
      break;
    case ")":
      l.emit(TokenType.RParen);
      break;
    case lex.eof:
      l.emit("EOF");
      return undefined;
    default:
      l.acceptRun(lex.alphanumeric + "'+-*/?!");
      l.emit(TokenType.Identifier);
  }

  return readSexp;
}

describe("Lexer", () => {
  it("should lex simple sexp correctly", () => {
    let input = " (+  foo 1)";
    testLexer(new lex.Lexer<TokenType>(input, readSexp), [
      new Token(TokenType.LParen, "("),
      new Token(TokenType.Identifier, "+"),
      new Token(TokenType.Identifier, "foo"),
      new Token(TokenType.Identifier, "1"),
      new Token(TokenType.RParen, ")"),
    ]);
  });
});

describe("NadderLexer", () => {
  it("should lex symbols correctly", () => {
    let input = `=+-*/<>(),: == !=`;
    testLexer(new lex.NadderLexer(input), [
      new Token(TokenType.Assign, "="),
      new Token(TokenType.Plus, "+"),
      new Token(TokenType.Minus, "-"),
      new Token(TokenType.Asterisk, "*"),
      new Token(TokenType.Slash, "/"),
      new Token(TokenType.LT, "<"),
      new Token(TokenType.GT, ">"),
      new Token(TokenType.LParen, "("),
      new Token(TokenType.RParen, ")"),
      new Token(TokenType.Comma, ","),
      new Token(TokenType.Colon, ":"),
      new Token(TokenType.EQ, "=="),
      new Token(TokenType.NEQ, "!="),
    ]);
  });

  it("should lex ints, identifiers, and indents", () => {
    let input = `five = 5
ten = 10
add = lambda x, y: x + y

def add_10(x):
    return add(x, ten)

if not 5 < 10:
    return True
else:
    return False

result = add_10(five)
`;

    testLexer(new lex.NadderLexer(input), [
      new Token(TokenType.Identifier, "five"),
      new Token(TokenType.Assign, "="),
      new Token(TokenType.Int, "5"),
      new Token(TokenType.Newline, "\n"),

      new Token(TokenType.Identifier, "ten"),
      new Token(TokenType.Assign, "="),
      new Token(TokenType.Int, "10"),
      new Token(TokenType.Newline, "\n"),

      new Token(TokenType.Identifier, "add"),
      new Token(TokenType.Assign, "="),
      new Token(TokenType.Lambda, "lambda"),
      new Token(TokenType.Identifier, "x"),
      new Token(TokenType.Comma, ","),
      new Token(TokenType.Identifier, "y"),
      new Token(TokenType.Colon, ":"),
      new Token(TokenType.Identifier, "x"),
      new Token(TokenType.Plus, "+"),
      new Token(TokenType.Identifier, "y"),
      new Token(TokenType.Newline, "\n"),

      new Token(TokenType.Def, "def"),
      new Token(TokenType.Identifier, "add_10"),
      new Token(TokenType.LParen, "("),
      new Token(TokenType.Identifier, "x"),
      new Token(TokenType.RParen, ")"),
      new Token(TokenType.Colon, ":"),
      new Token(TokenType.Newline, "\n"),
      new Token(TokenType.Indent, "    "),
      new Token(TokenType.Return, "return"),
      new Token(TokenType.Identifier, "add"),
      new Token(TokenType.LParen, "("),
      new Token(TokenType.Identifier, "x"),
      new Token(TokenType.Comma, ","),
      new Token(TokenType.Identifier, "ten"),
      new Token(TokenType.RParen, ")"),
      new Token(TokenType.Newline, "\n"),
      new Token(TokenType.Dedent, ""),

      new Token(TokenType.If, "if"),
      new Token(TokenType.Not, "not"),
      new Token(TokenType.Int, "5"),
      new Token(TokenType.LT, "<"),
      new Token(TokenType.Int, "10"),
      new Token(TokenType.Colon, ":"),
      new Token(TokenType.Newline, "\n"),
      new Token(TokenType.Indent, "    "),
      new Token(TokenType.Return, "return"),
      new Token(TokenType.True, "True"),
      new Token(TokenType.Newline, "\n"),
      new Token(TokenType.Dedent, ""),
      new Token(TokenType.Else, "else"),
      new Token(TokenType.Colon, ":"),
      new Token(TokenType.Newline, "\n"),
      new Token(TokenType.Indent, "    "),
      new Token(TokenType.Return, "return"),
      new Token(TokenType.False, "False"),
      new Token(TokenType.Newline, "\n"),
      new Token(TokenType.Dedent, ""),

      new Token(TokenType.Identifier, "result"),
      new Token(TokenType.Assign, "="),
      new Token(TokenType.Identifier, "add_10"),
      new Token(TokenType.LParen, "("),
      new Token(TokenType.Identifier, "five"),
      new Token(TokenType.RParen, ")"),
      new Token(TokenType.Newline, "\n"),
    ]);
  });
});
