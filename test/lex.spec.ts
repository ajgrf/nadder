// Copyright (c) 2020, Alex Griffin <a@ajgrf.com>
//
// Use of this source code is governed by an ISC-style
// license that can be found in the LICENSE file.

import assert from "assert";
import * as lex from "../src/lex";
import { TokenType } from "../src/lex";

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
    testLexer(lex.newLexer<TokenType>(input, readSexp), [
      { value: "(", type: TokenType.LParen },
      { value: "+", type: TokenType.Identifier },
      { value: "foo", type: TokenType.Identifier },
      { value: "1", type: TokenType.Identifier },
      { value: ")", type: TokenType.RParen },
    ]);
  });
});

describe("NadderLexer", () => {
  it("should lex symbols correctly", () => {
    let input = `=+-*/<>(),: == !=`;
    testLexer(new lex.NadderLexer(input), [
      { value: "=", type: TokenType.Assign },
      { value: "+", type: TokenType.Plus },
      { value: "-", type: TokenType.Minus },
      { value: "*", type: TokenType.Asterisk },
      { value: "/", type: TokenType.Slash },
      { value: "<", type: TokenType.LT },
      { value: ">", type: TokenType.GT },
      { value: "(", type: TokenType.LParen },
      { value: ")", type: TokenType.RParen },
      { value: ",", type: TokenType.Comma },
      { value: ":", type: TokenType.Colon },
      { value: "==", type: TokenType.EQ },
      { value: "!=", type: TokenType.NEQ },
    ]);
  });

  it("should lex ints, identifiers, and indents", () => {
    let input = `let five = 5
let ten = 10
let add = lambda x, y: x + y

def add_10(x):
    return add(x, ten)

if not 5 < 10:
    return True
else:
    return False

let result = add_10(five)
`;

    testLexer(new lex.NadderLexer(input), [
      { value: "let", type: TokenType.Let },
      { value: "five", type: TokenType.Identifier },
      { value: "=", type: TokenType.Assign },
      { value: "5", type: TokenType.Int },
      { value: "\n", type: TokenType.Newline },

      { value: "let", type: TokenType.Let },
      { value: "ten", type: TokenType.Identifier },
      { value: "=", type: TokenType.Assign },
      { value: "10", type: TokenType.Int },
      { value: "\n", type: TokenType.Newline },

      { value: "let", type: TokenType.Let },
      { value: "add", type: TokenType.Identifier },
      { value: "=", type: TokenType.Assign },
      { value: "lambda", type: TokenType.Lambda },
      { value: "x", type: TokenType.Identifier },
      { value: ",", type: TokenType.Comma },
      { value: "y", type: TokenType.Identifier },
      { value: ":", type: TokenType.Colon },
      { value: "x", type: TokenType.Identifier },
      { value: "+", type: TokenType.Plus },
      { value: "y", type: TokenType.Identifier },
      { value: "\n", type: TokenType.Newline },

      { value: "def", type: TokenType.Def },
      { value: "add_10", type: TokenType.Identifier },
      { value: "(", type: TokenType.LParen },
      { value: "x", type: TokenType.Identifier },
      { value: ")", type: TokenType.RParen },
      { value: ":", type: TokenType.Colon },
      { value: "\n", type: TokenType.Newline },
      { value: "    ", type: TokenType.Indent },
      { value: "return", type: TokenType.Return },
      { value: "add", type: TokenType.Identifier },
      { value: "(", type: TokenType.LParen },
      { value: "x", type: TokenType.Identifier },
      { value: ",", type: TokenType.Comma },
      { value: "ten", type: TokenType.Identifier },
      { value: ")", type: TokenType.RParen },
      { value: "\n", type: TokenType.Newline },
      { value: "", type: TokenType.Dedent },

      { value: "if", type: TokenType.If },
      { value: "not", type: TokenType.Not },
      { value: "5", type: TokenType.Int },
      { value: "<", type: TokenType.LT },
      { value: "10", type: TokenType.Int },
      { value: ":", type: TokenType.Colon },
      { value: "\n", type: TokenType.Newline },
      { value: "    ", type: TokenType.Indent },
      { value: "return", type: TokenType.Return },
      { value: "True", type: TokenType.True },
      { value: "\n", type: TokenType.Newline },
      { value: "", type: TokenType.Dedent },
      { value: "else", type: TokenType.Else },
      { value: ":", type: TokenType.Colon },
      { value: "\n", type: TokenType.Newline },
      { value: "    ", type: TokenType.Indent },
      { value: "return", type: TokenType.Return },
      { value: "False", type: TokenType.False },
      { value: "\n", type: TokenType.Newline },
      { value: "", type: TokenType.Dedent },

      { value: "let", type: TokenType.Let },
      { value: "result", type: TokenType.Identifier },
      { value: "=", type: TokenType.Assign },
      { value: "add_10", type: TokenType.Identifier },
      { value: "(", type: TokenType.LParen },
      { value: "five", type: TokenType.Identifier },
      { value: ")", type: TokenType.RParen },
      { value: "\n", type: TokenType.Newline },
    ]);
  });
});
