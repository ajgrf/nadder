// Copyright (c) 2020, Alex Griffin <a@ajgrf.com>
//
// Use of this source code is governed by an ISC-style
// license that can be found in the LICENSE file.

// Based on Rob Pike's talk, Lexical Scanning in Go:
// https://talks.golang.org/2011/lex.slide

export const alpha = "_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const digit = "0123456789";
export const alphanumeric = alpha + digit;
export const eof = String.fromCharCode(-1);

/** Tag to identify the type of a lexical token. */
export type TokenTag<T> = T | "EOF" | "Illegal";

/** A Token consists of a type tag attached to the literal string. */
export interface Token<T> {
  type: TokenTag<T>;
  value: string;
}

/** The Lexer state as a function returning the new state. */
export type StateFn<T> = undefined | ((lex: Lexer<T>) => StateFn<T>);

/** Generic lexer machinery without language-specific bits. */
export interface Lexer<T> extends Iterable<Token<T>>, Iterator<Token<T>> {
  emit: (t: TokenTag<T>) => void;
  pending: () => string;
  nextChar: () => string;
  ignore: () => void;
  backUp: () => void;
  peek: () => string;
  accept: (valid: string) => boolean;
  acceptRun: (valid: string) => void;
  errorf: (message: string) => StateFn<T>;
}

/** Initialize a Lexer to tokenize `input` given start `state`. */
export function newLexer<T>(input: string, state: StateFn<T>): Lexer<T> {
  let lexer: Lexer<T> = {
    emit,
    pending,
    nextChar,
    ignore,
    backUp,
    peek,
    accept,
    acceptRun,
    errorf,
    next,
    [Symbol.iterator]: iterator,
  };

  let start: number = 0; // Start position of this token
  let pos: number = 0; // Current position in the input
  let width: number = 0; // Width of last character read from input
  let tokens: Token<T>[] = []; // FIFO array of lexed tokens

  /** Return the next token. */
  function nextToken(): Token<T> {
    while (true) {
      if (tokens.length > 0) {
        return tokens.shift()!;
      } else if (state) {
        state = state(lexer);
      } else {
        throw "Bad lexer state!";
      }
    }
  }

  /** Emit a token with the given TokenType and accepted input. */
  function emit(t: TokenTag<T>) {
    tokens.push({ type: t, value: pending() });
    start = pos;
  }

  /** Return the input accepted so far. */
  function pending(): string {
    return input.slice(start, pos);
  }

  /** Advance lexer to the next input character and return it. */
  function nextChar(): string {
    if (pos >= input.length) {
      width = 0;
      return eof;
    }
    let char = input[pos];
    let rune = input.codePointAt(pos);
    if (rune) {
      char = String.fromCodePoint(rune);
    }
    width = char.length;
    pos += width;
    return char;
  }

  /** Discard pending input. */
  function ignore() {
    start = pos;
  }

  /** Go back one character in the input. */
  function backUp() {
    pos -= width;
  }

  /** Return the next input character without advancing. */
  function peek(): string {
    let char = nextChar();
    backUp();
    return char;
  }

  /** Advance one character if it appears in `valid`. */
  function accept(valid: string): boolean {
    if (valid.indexOf(nextChar()) >= 0) {
      return true;
    } else {
      backUp();
      return false;
    }
  }

  /** Advance while characters appear in `valid`. */
  function acceptRun(valid: string) {
    while (accept(valid)) {}
  }

  /** Signal error by emitting an Illegal Token with the given message. */
  function errorf(message: string): StateFn<T> {
    tokens.push({ type: "Illegal", value: message });
    return undefined;
  }

  // Implement iterator protocol.
  function next(): IteratorResult<Token<T>> {
    let tok = nextToken();
    return {
      value: tok,
      done: tok.type === "EOF",
    };
  }

  // Implement iterable protocol.
  function iterator(): Iterator<Token<T>> {
    return { next };
  }

  return lexer;
}

/** Lexical categories for Nadder tokens. */
export enum TokenType {
  // Identifiers + literals
  Identifier,
  Int,

  // Operators
  Assign,
  Plus,
  Minus,
  Asterisk,
  Slash,

  LT,
  GT,
  EQ,
  NEQ,

  // Delimiters
  Comma,
  Colon,
  LParen,
  RParen,

  Newline,
  Indent,
  Dedent,

  // Keywords
  Def,
  Lambda,
  Let,
  True,
  False,
  If,
  Else,
  Not,
  Return,
}

/** A Lexer instantiated for the Nadder language. */
export class NadderLexer implements Iterable<Token<TokenType>> {
  /** Underlying lexer. */
  private lexer: Lexer<TokenType>;

  /** Stack of indentation levels. */
  private indents: number[];

  constructor(input: string) {
    this.lexer = newLexer<TokenType>(input, this.lexIndentation.bind(this));
    this.indents = [0];
  }

  /** Emit Indent and Dedent tokens to delimit blocks by indentation level. */
  private lexIndentation(lex: Lexer<TokenType>): StateFn<TokenType> {
    // Uses the same algorithm as Python, without allowing tabs:
    // https://docs.python.org/3/reference/lexical_analysis.html#indentation

    // Discard blank lines.
    lex.acceptRun("\n\r");
    lex.ignore();

    lex.acceptRun(" ");

    let indent = lex.pending().length;
    let prevIndent = this.indents.pop()!;

    if (indent < prevIndent) {
      for (let i = this.indents.length; i >= 0; i--) {
        if (indent < prevIndent) {
          prevIndent = this.indents.pop()!;
          lex.emit(TokenType.Dedent);
        } else if (indent === prevIndent) {
          break;
        } else {
          return lex.errorf("inconsistent dedent");
        }
      }
    } else if (indent > prevIndent) {
      lex.emit(TokenType.Indent);
    }

    this.indents.push(indent);
    return this.lexExpression.bind(this);
  }

  /** Skip ahead to the next non-whitespace input. */
  private eatWhiteSpace(lex: Lexer<TokenType>): StateFn<TokenType> {
    this.lexer.acceptRun(" ");
    this.lexer.ignore();
    return undefined;
  }

  /** Tokenize a Nadder expression. */
  private lexExpression(lex: Lexer<TokenType>): StateFn<TokenType> {
    this.eatWhiteSpace(lex);

    let char = lex.nextChar();
    switch (char) {
      case "=":
        if (lex.peek() === "=") {
          lex.nextChar();
          lex.emit(TokenType.EQ);
        } else {
          lex.emit(TokenType.Assign);
        }
        break;
      case "+":
        lex.emit(TokenType.Plus);
        break;
      case "-":
        lex.emit(TokenType.Minus);
        break;
      case "*":
        lex.emit(TokenType.Asterisk);
        break;
      case "/":
        lex.emit(TokenType.Slash);
        break;
      case "!":
        if (lex.peek() === "=") {
          lex.nextChar();
          lex.emit(TokenType.NEQ);
        } else {
          return lex.errorf(`expected '=', found '${char}'`);
        }
        break;
      case "<":
        lex.emit(TokenType.LT);
        break;
      case ">":
        lex.emit(TokenType.GT);
        break;
      case "(":
        lex.emit(TokenType.LParen);
        break;
      case ")":
        lex.emit(TokenType.RParen);
        break;
      case ",":
        lex.emit(TokenType.Comma);
        break;
      case ":":
        lex.emit(TokenType.Colon);
        break;
      case "\n":
      case "\r":
        lex.emit(TokenType.Newline);
        return this.lexIndentation.bind(this);
      case eof:
        lex.emit("EOF");
        return undefined;
      default:
        if (alpha.includes(char)) {
          return this.lexIdentifier.bind(this);
        } else if (digit.includes(char)) {
          return this.lexNumber.bind(this);
        } else {
          return lex.errorf(`illegal character: '${char}'`);
        }
    }

    return this.lexExpression.bind(this);
  }

  /* Mapping of keywords to TokenTypes. */
  private keywords: { [key: string]: TokenType } = {
    def: TokenType.Def,
    lambda: TokenType.Lambda,
    let: TokenType.Let,
    True: TokenType.True,
    False: TokenType.False,
    if: TokenType.If,
    else: TokenType.Else,
    not: TokenType.Not,
    return: TokenType.Return,
  };

  /** Tokenize an identifier or keyword. */
  private lexIdentifier(lex: Lexer<TokenType>): StateFn<TokenType> {
    lex.accept(alpha);
    lex.acceptRun(alphanumeric);

    // Emit keyword token if possible, else an identifier.
    lex.emit(this.keywords[lex.pending()] || TokenType.Identifier);

    return this.lexExpression.bind(this);
  }

  /** Tokenize a number. */
  private lexNumber(lex: Lexer<TokenType>): StateFn<TokenType> {
    lex.acceptRun(digit);

    // Next thing can't be alphanumeric.
    if (alpha.includes(lex.peek())) {
      lex.nextChar();
      return lex.errorf(`bad number syntax: '${lex.pending()}'`);
    }

    lex.emit(TokenType.Int);
    return this.lexExpression.bind(this);
  }

  // Implement iterator protocol.
  next(): IteratorResult<Token<TokenType>> {
    return this.lexer.next();
  }

  // Implement iterable protocol.
  [Symbol.iterator](): Iterator<Token<TokenType>> {
    return this;
  }
}
