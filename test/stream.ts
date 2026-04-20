/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { assertEquals, assertThrows } from "@std/assert";
import { StringStream } from "~combinators/stream.ts";

Deno.test("StringStream: initial state", () => {
	const s = new StringStream("hello");
	assertEquals(s.position, { line: 1, column: 1, offset: 0 });
	assertEquals(s.isEOF(), false);
	assertEquals(s.peek(), "h");
	assertEquals(s.tail(), "hello");
	assertEquals(s.source, "hello");
});

Deno.test("StringStream: advance", () => {
	const s = new StringStream("ab");
	assertEquals(s.advance(), "a");
	assertEquals(s.position, { line: 1, column: 2, offset: 1 });
	assertEquals(s.advance(), "b");
	assertEquals(s.position, { line: 1, column: 3, offset: 2 });
	assertEquals(s.advance(), null);
	assertEquals(s.isEOF(), true);
});

Deno.test("StringStream: newline tracking", () => {
	const s = new StringStream("a\nb\nc");
	s.advance(); // 'a'
	assertEquals(s.position, { line: 1, column: 2, offset: 1 });

	s.advance(); // '\n'
	assertEquals(s.position, { line: 2, column: 1, offset: 2 });

	s.advance(); // 'b'
	assertEquals(s.position, { line: 2, column: 2, offset: 3 });

	s.advance(); // '\n'
	assertEquals(s.position, { line: 3, column: 1, offset: 4 });

	s.advance(); // 'c'
	assertEquals(s.position, { line: 3, column: 2, offset: 5 });
});

Deno.test("StringStream: peek with offset", () => {
	const s = new StringStream("abcde");
	assertEquals(s.peek(0), "a");
	assertEquals(s.peek(1), "b");
	assertEquals(s.peek(4), "e");
	assertEquals(s.peek(5), null);
	assertEquals(s.peek(-1), null);
});

Deno.test("StringStream: lookbehind", () => {
	const s = new StringStream("abc");
	s.advance();
	s.advance();
	assertEquals(s.lookbehind(1), "b");
	assertEquals(s.lookbehind(2), "a");
	assertEquals(s.lookbehind(3), null);
});

Deno.test("StringStream: push/pop/restore naming", () => {
	const s = new StringStream("abc");

	s.push();
	s.advance();
	assertEquals(s.position.column, 2);

	s.push();
	s.advance();
	assertEquals(s.position.column, 3);

	s.restore();
	assertEquals(s.position.column, 2);

	s.pop();
	assertEquals(s.position.column, 2);
});

Deno.test("StringStream: restore undoes newline", () => {
	const s = new StringStream("a\nb");
	s.push();
	s.advance();
	s.advance();
	assertEquals(s.position.line, 2);

	s.restore();
	assertEquals(s.position, { line: 1, column: 1, offset: 0 });
});

Deno.test("StringStream: pop with no history throws", () => {
	const s = new StringStream("a");
	assertThrows(() => s.pop(), "no saved positions");
});

Deno.test("StringStream: restore with no history throws", () => {
	const s = new StringStream("a");
	assertThrows(() => s.restore(), "no saved positions");
});

Deno.test("StringStream: nested checkpoints", () => {
	const s = new StringStream("abcd");

	s.push();
	s.advance();
	s.push();
	s.advance();
	s.push();
	s.advance();

	s.restore();
	assertEquals(s.position.offset, 2);

	s.restore();
	assertEquals(s.position.offset, 1);

	s.pop();
	assertEquals(s.position.offset, 1);
});

Deno.test("StringStream: tail", () => {
	const s = new StringStream("hello world");
	assertEquals(s.tail(), "hello world");
	s.advance();
	s.advance();
	assertEquals(s.tail(), "llo world");
});

Deno.test("StringStream: slice", () => {
	const s = new StringStream("hello world");
	s.advance();
	s.advance();
	s.advance();
	assertEquals(s.slice(0), "hel");
	assertEquals(s.slice(0, 5), "hello");
});

Deno.test("StringStream: matches", () => {
	const s = new StringStream("hello");
	assertEquals(s.matches("hel"), true);
	assertEquals(s.matches("hello"), true);
	assertEquals(s.matches("hellx"), false);
	assertEquals(s.matches("helloo"), false);
	assertEquals(s.matches(""), true);
});

Deno.test("StringStream: expect", () => {
	const s = new StringStream("hello");
	assertEquals(s.expect("hel"), true);
	assertEquals(s.position.offset, 3);
	assertEquals(s.expect("lo"), true);
	assertEquals(s.position.offset, 5);
	assertEquals(s.expect("x"), false);
	assertEquals(s.position.offset, 5);
});

Deno.test("StringStream: consumeWhile", () => {
	const s = new StringStream("123abc");
	const digits = s.consumeWhile((c) => c >= "0" && c <= "9");
	assertEquals(digits, "123");
	assertEquals(s.position.offset, 3);
	assertEquals(s.peek(), "a");
});

Deno.test("StringStream: consumeWhile consumes nothing", () => {
	const s = new StringStream("abc");
	const digits = s.consumeWhile((c) => c >= "0" && c <= "9");
	assertEquals(digits, "");
	assertEquals(s.position.offset, 0);
});

Deno.test("StringStream: skipWhitespace", () => {
	const s = new StringStream("   \t\n  hello");
	s.skipWhitespace();
	assertEquals(s.position, { line: 2, column: 3, offset: 7 });
	assertEquals(s.peek(), "h");
});

Deno.test("StringStream: currentLine", () => {
	const s = new StringStream("first\nsecond\nthird");
	assertEquals(s.currentLine, "first");
	s.advance();
	s.advance();
	s.advance();
	s.advance();
	s.advance();
	s.advance(); // past '\n'
	assertEquals(s.currentLine, "second");
	s.advance();
	s.advance();
	s.advance();
	s.advance();
	s.advance();
	s.advance();
	s.advance(); // past '\n'
	assertEquals(s.currentLine, "third");
});

Deno.test("StringStream: clone is independent", () => {
	const s = new StringStream("abc");
	const c = s.clone();
	s.advance();
	assertEquals(s.position.offset, 1);
	assertEquals(c.position.offset, 0);
	assertEquals(s.peek(), "b");
	assertEquals(c.peek(), "a");
});

Deno.test("StringStream: clone shares source", () => {
	const s = new StringStream("abc");
	const c = s.clone();
	assertEquals(c.source, "abc");
	assertEquals(c.tail(), "abc");
});

Deno.test("StringStream: positions are 1-indexed", () => {
	const s = new StringStream("x");
	assertEquals(s.position.line, 1);
	assertEquals(s.position.column, 1);
	s.advance();
	assertEquals(s.position.line, 1);
	assertEquals(s.position.column, 2);
});
