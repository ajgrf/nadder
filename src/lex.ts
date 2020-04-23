// Copyright (c) 2020, Alex Griffin <a@ajgrf.com>
//
// Use of this source code is governed by an ISC-style
// license that can be found in the LICENSE file.

// Based on Rob Pike's talk, Lexical Scanning in Go:
// https://talks.golang.org/2011/lex.slide

export const alpha = "_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const digit = "0123456789";
export const alphanumeric = alpha + digit;
export const whitespace = " \t\n\r";
export const eof = String.fromCharCode(-1);

/** Tag to identify the type of a lexical token. */
export type TokenTag<T> = T | "EOF" | "Illegal";

/** A Token consists of a type tag attached to the literal string. */
export class Token<T> {
  constructor(public type: TokenTag<T>, public value: string) {}
}

/** The Lexer state as a function returning the new state. */
export type StateFn<T> = undefined | ((lex: Lexer<T>) => StateFn<T>);

/** Generic lexer machinery without language-specific bits. */
export class Lexer<T> implements Iterable<Token<T>> {
  /** The string being lexed. */
  private input: string;
  /** Start position of this token. */
  private start: number;
  /** Current position in the input. */
  private pos: number;
  /** Width of last character read from input. */
  private width: number;
  /** FIFO array of lexed tokens. */
  private tokens: Token<T>[];
  /** Current lexer state. */
  private state: StateFn<T>;

  /** Initialize a Lexer to tokenize `input` given `start` state. */
  constructor(input: string, start: StateFn<T>) {
    this.input = input;
    this.start = 0;
    this.pos = 0;
    this.width = 1;
    this.tokens = new Array<Token<T>>();
    this.state = start;
  }

  /** Return the next token. */
  nextToken(): Token<T> {
    while (true) {
      if (this.tokens.length > 0) {
        return this.tokens.shift()!;
      } else if (this.state) {
        this.state = this.state(this);
      } else {
        throw "Bad lexer state!";
      }
    }
  }

  /** Emit a token with the given TokenType and accepted input. */
  emit(t: TokenTag<T>) {
    this.tokens.push(new Token<T>(t, this.pending()));
    this.start = this.pos;
  }

  /** Return the input accepted so far. */
  pending(): string {
    return this.input.slice(this.start, this.pos);
  }

  /** Advance lexer to the next input character and return it. */
  nextChar(): string {
    if (this.pos >= this.input.length) {
      this.width = 0;
      return eof;
    }
    let char = this.input[this.pos];
    this.pos += this.width;
    return char;
  }

  /** Discard pending input. */
  ignore() {
    this.start = this.pos;
  }

  /** Go back one character in the input. */
  backUp() {
    this.pos -= this.width;
  }

  /** Return the next input character without advancing. */
  peek(): string {
    let char = this.nextChar();
    this.backUp();
    return char;
  }

  /** Advance one character if it appears in `valid`. */
  accept(valid: string): boolean {
    if (valid.indexOf(this.nextChar()) >= 0) {
      return true;
    } else {
      this.backUp();
      return false;
    }
  }

  /** Advance while characters appear in `valid`. */
  acceptRun(valid: string) {
    while (this.accept(valid)) {}
  }

  /** Signal error by emitting an Illegal Token with the given message. */
  errorf(message: string): StateFn<T> {
    this.tokens.push(new Token<T>("Illegal", message));
    return undefined;
  }

  // Implement iterator protocol.
  next(): IteratorResult<Token<T>> {
    let tok = this.nextToken();
    return {
      value: tok,
      done: tok.type === "EOF",
    };
  }

  // Implement iterable protocol.
  [Symbol.iterator](): Iterator<Token<T>> {
    return this;
  }
}

/** Lexical categories for Nadder tokens. */
export enum TokenType {
  // Identifiers + literals
  Identifier,

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
  Return,
}

/** A Lexer instantiated for the Nadder language. */
export class NadderLexer implements Iterable<Token<TokenType>> {
  /** Underlying lexer. */
  private lexer: Lexer<TokenType>;

  /** Stack of indentation levels. */
  private indents: number[];

  constructor(input: string) {
    this.lexer = new Lexer<TokenType>(input, this.lexExpression.bind(this));
    this.indents = [0];
  }

  private lexExpression(lex: Lexer<TokenType>): StateFn<TokenType> {
    let char = lex.nextChar();
    switch (char) {
      case "=":
        lex.emit(TokenType.Assign);
        break;
      case "+":
        lex.emit(TokenType.Plus);
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
      case eof:
        lex.emit("EOF");
        return undefined;
      default:
        lex.acceptRun(alphanumeric);
        lex.emit(TokenType.Identifier);
    }

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
