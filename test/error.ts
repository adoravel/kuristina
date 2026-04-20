/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { assertEquals, assertThrows } from "@std/assert";
import { StringStream } from "~combinators/stream.ts";
import {
	buildDefaultMessage,
	getContext,
	getPosition,
	mergeErrors,
	ParsingError,
	prettify,
} from "~combinators/error.ts";
import { literal, pick } from "~combinators/constructions.ts";
import { assertFail } from "./mod.ts";

Deno.test("buildDefaultMessage", () => {
	assertEquals(
		buildDefaultMessage(["'hello'"], "w", { line: 1, column: 1, offset: 0 }),
		"Expected 'hello' at line 1, column 1, but found 'w'",
	);

	assertEquals(
		buildDefaultMessage(["'a'", "'b'"], "c", { line: 3, column: 5, offset: 10 }),
		"Expected 'a' or 'b' at line 3, column 5, but found 'c'",
	);

	const msg = buildDefaultMessage(
		["'x'", "'y'", "'z'"],
		"w",
		{ line: 1, column: 1, offset: 0 },
	);
	assertEquals(msg.includes("one of:"), true);
	assertEquals(msg.includes("'x', 'y', 'z'"), true);
});

Deno.test("getPosition", () => {
	const s = new StringStream("hello\nworld");
	s.advance();
	assertEquals(getPosition(s), { line: 1, column: 2, offset: 1 });

	s.advance();
	s.advance();
	s.advance();
	s.advance();
	s.advance(); // '\n'
	assertEquals(getPosition(s), { line: 2, column: 1, offset: 6 });
});

Deno.test("getContext", () => {
	const s = new StringStream("hello world");
	s.advance();
	s.advance();
	s.advance();

	const ctx = getContext(s, 3);
	assertEquals(ctx.before, "hel");
	assertEquals(ctx.at, "l");
	assertEquals(ctx.after, "o w");
	assertEquals(ctx.line, "hello world");
	assertEquals(ctx.pointerColumn, 4);
});

Deno.test("getContext: @ newline", () => {
	const s = new StringStream("hello\nworld");
	for (let i = 0; i < 5; i++) s.advance();

	const ctx = getContext(s);
	assertEquals(ctx.at, "\\n");
});

Deno.test("getContext: @ EOF", () => {
	const s = new StringStream("hi");
	s.advance();
	s.advance();

	const ctx = getContext(s);
	assertEquals(ctx.at, "<EOF>");
});

Deno.test("getContext: @ tab (\\t)", () => {
	const s = new StringStream("a\tb");
	s.advance();

	const ctx = getContext(s);
	assertEquals(ctx.at, "\\t");
});

Deno.test("mergeErrors: single error returns as-is", () => {
	const err: ParsingError = {
		position: { line: 1, column: 1, offset: 0 },
		expected: ["'x'"],
		found: "y",
		message: "test",
		stack: [],
	};
	assertEquals(mergeErrors([err]), err);
});

Deno.test("mergeErrors: zero errors throws", () => {
	assertThrows(() => mergeErrors([]), "cannot merge zero errors");
});

Deno.test("mergeErrors: picks furthest offset", () => {
	const near: ParsingError = {
		position: { line: 1, column: 1, offset: 0 },
		expected: ["'a'"],
		found: "x",
		message: "near",
		stack: [],
	};
	const far: ParsingError = {
		position: { line: 1, column: 5, offset: 4 },
		expected: ["'b'"],
		found: "y",
		message: "far",
		stack: [],
	};

	const merged = mergeErrors([near, far]);
	assertEquals(merged.position.offset, 4);
	assertEquals(merged.expected, ["'b'"]);
});

Deno.test("mergeErrors: combines expected at same offset", () => {
	const err1: ParsingError = {
		position: { line: 1, column: 3, offset: 2 },
		expected: ["'a'", "'b'"],
		found: "x",
		message: "err1",
		stack: [],
	};
	const err2: ParsingError = {
		position: { line: 1, column: 3, offset: 2 },
		expected: ["'c'", "'a'"], // 'a' is duplicate
		found: "x",
		message: "err2",
		stack: [],
	};

	const merged = mergeErrors([err1, err2]);
	assertEquals(merged.position.offset, 2);
	assertEquals(merged.expected, ["'a'", "'b'", "'c'"]);
});

Deno.test("mergeErrors: combines stack frames, dedupes by key", () => {
	const frame = { parser: "test", position: { line: 1, column: 1, offset: 0 } };
	const err1: ParsingError = {
		position: { line: 1, column: 1, offset: 0 },
		expected: ["'a'"],
		found: "x",
		message: "",
		stack: [frame],
	};
	const err2: ParsingError = {
		position: { line: 1, column: 1, offset: 0 },
		expected: ["'b'"],
		found: "x",
		message: "",
		stack: [frame, { parser: "other", position: { line: 1, column: 1, offset: 0 } }],
	};

	const merged = mergeErrors([err1, err2]);
	assertEquals(merged.stack.length, 2);
});

Deno.test("prettify: includes message", () => {
	const err: ParsingError = {
		position: { line: 1, column: 1, offset: 0 },
		expected: ["'hello'"],
		found: "world",
		message: "Expected 'hello' at line 1, column 1, but found 'world'",
		context: {
			before: "",
			at: "w",
			after: "orld",
			line: "world",
			pointerColumn: 1,
		},
		stack: [],
	};

	const pretty = prettify(err);
	assertEquals(pretty.includes("Parse Error"), true);
	assertEquals(pretty.includes("line 1, column 1"), true);
	assertEquals(pretty.includes("'hello'"), true);
	assertEquals(pretty.includes("'world'"), true);
});

Deno.test("prettify: includes context section", () => {
	const err: ParsingError = {
		position: { line: 2, column: 5, offset: 10 },
		expected: ["';'"],
		found: "x",
		message: "",
		context: {
			before: "let ",
			at: "x",
			after: " = 1",
			line: "let x = 1",
			pointerColumn: 5,
		},
		stack: [],
	};

	const pretty = prettify(err);
	assertEquals(pretty.includes("Context:"), true);
	assertEquals(pretty.includes("«x»"), true);
	assertEquals(pretty.includes("let x = 1"), true);
});

Deno.test("prettify: includes parser stack", () => {
	const err: ParsingError = {
		position: { line: 1, column: 1, offset: 0 },
		expected: ["']'"],
		found: "<EOF>",
		message: "",
		stack: [
			{ parser: "array", position: { line: 1, column: 1, offset: 0 } },
			{ parser: "value", position: { line: 1, column: 3, offset: 2 } },
		],
	};

	const pretty = prettify(err);
	assertEquals(pretty.includes("Parser Stack:"), true);
	assertEquals(pretty.includes("1. array"), true);
	assertEquals(pretty.includes("2. value"), true);
});

Deno.test("error from literal failure has position", () => {
	const err = assertFail(literal("hello")(new StringStream("world")));
	assertEquals(err.position.offset, 0);
	assertEquals(err.position.line, 1);
	assertEquals(err.position.column, 1);
	assertEquals(err.found, "w");
	assertEquals(err.expected.includes('"hello"'), true);
});

Deno.test("error from pick merges alternatives", () => {
	const err = assertFail(pick("a", "b", "c")(new StringStream("x")));
	assertEquals(err.expected.length, 3);
	assertEquals(err.expected.includes('"a"'), true);
	assertEquals(err.expected.includes('"b"'), true);
	assertEquals(err.expected.includes('"c"'), true);
});

Deno.test("error from pick at EOF with no lookbehind says <unknown>", () => {
	const err = assertFail(pick("a", "b")(new StringStream("")));
	assertEquals(err.found, "<unknown>");
});

Deno.test("error from pick at EOF with lookbehind shows previous char", () => {
	const s = new StringStream("x");
	s.advance();
	const err = assertFail(pick("a", "b")(s));
	assertEquals(err.found, "x");
});

Deno.test("error from literal mid-string has correct position", () => {
	const err = assertFail(literal("world")(new StringStream("hello world")));
	assertEquals(err.position.offset, 0);
	assertEquals(err.found, "h");
});

Deno.test("parser stack accumulates through maps", () => {
	const parser = literal("x")
		.map("outer", (_, v) => ({ kind: "success" as const, data: v }))
		.map("inner", (_, v) => ({ kind: "success" as const, data: v }));

	const err = assertFail(parser(new StringStream("y")));
	const tags = err.stack.map((f) => f.parser);

	assertEquals(tags[0], "outer");
	assertEquals(tags[1], '"x"');
	assertEquals(tags.includes("inner"), false);
	assertEquals(tags.length, 2);
});
