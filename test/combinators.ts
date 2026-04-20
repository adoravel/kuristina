/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { assertEquals } from "@std/assert";
import { $, StringStream } from "~combinators/stream.ts";
import {
	all,
	array,
	atLeast,
	atMost,
	between,
	capture,
	discard,
	endBy,
	eof,
	few,
	insensitive,
	literal,
	lookahead,
	many,
	negate,
	only,
	optional,
	pattern,
	pick,
	range,
	sepBy,
	sepBy1,
	sepEndBy,
	sequence,
	surrounded,
	token,
	unordered,
} from "~combinators/constructions.ts";
import { skipWhitespace } from "~combinators/constructions.ts";
import { assertFail, assertSuccess, compare } from "./mod.ts";
import { yay } from "~combinators/error.ts";

Deno.test("literal parser", () => {
	compare(literal("")($`anything`), "");
	compare(literal("guh")($`guh`), "guh");
	compare(literal("Hello")($`Hello world`), "Hello");
	assertFail(literal("Hallo")($`Hello`));
	assertFail(literal("x")($``));
});

Deno.test("insensitive parser", () => {
	compare(insensitive("hello")($`hello`), "hello");
	compare(insensitive("hello")($`HELLO`), "hello");
	compare(insensitive("hello")($`HeLLo`), "hello");
	compare(insensitive("Hello")($`hELLO`), "Hello");
	assertFail(insensitive("hello")($`hellx`));
	assertFail(insensitive("hello")($``));
});

Deno.test("range parser", () => {
	compare(range("a", "f")($`b`), "b");
	compare(range("a", "f")($`a`), "a");
	compare(range("a", "f")($`f`), "f");
	assertFail(range("a", "f")($`z`));
	assertFail(range("a", "f")($`A`));
	assertFail(range("0", "9")($`a`));
	compare(range("0", "9")($`5`), "5");
});

Deno.test("pattern parser", () => {
	compare(pattern(/[a-z]+/)($`abc123`), "abc");
	compare(pattern(/\d+/)($`42 rest`), "42");
	compare(pattern(/[a-z]+/i)($`ABC`), "ABC");
	assertFail(pattern(/[a-z]+/)($`123`));
	assertFail(pattern(/[a-z]+/)($``));
});

Deno.test("pattern inherits flags", () => {
	compare(pattern(/hello/i)($`HELLO`), "HELLO");
});

Deno.test("capture parser", () => {
	compare(capture(/(\d+)-(\d+)/)($`12-34`), {
		match: "12-34",
		groups: ["12", "34"],
	});
	compare(capture(/(w+)/)($`www`), {
		match: "www",
		groups: ["www"],
	});
	compare(capture(/no-groups/)($`no-groups`), {
		match: "no-groups",
		groups: [],
	});
	assertFail(capture(/(\d+)-(\d+)/)($`oops`));
});

Deno.test("eof parser", () => {
	compare(eof()($``), null);
	assertFail(eof()($`x`));
	assertFail(eof()($` `));
});

Deno.test("skipWhitespace", () => {
	const s = new StringStream("   hello");
	skipWhitespace(s);
	assertEquals(s.peek(), "h");
	assertEquals(s.position.column, 4);
});

Deno.test("few combinator", () => {
	compare(few("a", "b")($`ab`), ["a", "b"]);
	compare(few("a", "b", "c")($`abc`), ["a", "b", "c"]);
	compare(few("a", "b")($`abc`), ["a", "b"]); // leaves 'c'
	assertFail(few("a", "b")($`a c`));
	assertFail(few("a")($``));
});

Deno.test("pick combinator", () => {
	compare(pick("x", "xabc", "abc")($`abc`), "abc");
	compare(pick("a", "b")($`b`), "b");
	compare(pick("a", "b")($`a`), "a");
	compare(pick("hello", "hi")($`hello`), "hello");
	assertFail(pick("a", "b")($`c`));
	assertFail(pick("a", "b")($``));
});

Deno.test("pick tries alternatives in order, first match wins", () => {
	compare(pick(literal("ab"), literal("abc"))($`abc`), "ab");
});

Deno.test("pick backtracks when first alternative fails", () => {
	const p = pick(literal("abc"), literal("ab"));
	compare(p($`abx`), "ab");

	const s = new StringStream("abx rest");
	p(s);
	assertEquals(s.peek(), "x");
});

Deno.test("pick merges errors from all alternatives", () => {
	const err = assertFail(pick("x", "y", "z")($`w`));
	assertEquals(err.expected.length, 3);
});

Deno.test("optional combinator", () => {
	compare(optional("nop")($`yop`), null);
	compare(optional("yes")($`yes`), "yes");
	compare(optional("yes")($`yes more`), "yes");
});

Deno.test("optional sets next property", () => {
	const opt = optional(literal("mayhaps"));
	assertEquals(opt.next?.tag, '"mayhaps"');
	assertEquals(opt.tag, '"mayhaps"?');
});

Deno.test("many combinator", () => {
	compare(many("a")($`aaaaab`), ["a", "a", "a", "a", "a"]);
	compare(many("a")($`b`), []);
	compare(many("a")($``), []);
	compare(many("ab")($`ababab`), ["ab", "ab", "ab"]);
	compare(many("ab")($`ababa`), ["ab", "ab"]);
});

Deno.test("many stops at first failure", () => {
	const result = many("a")($`aaab`);
	const data = assertSuccess(result);
	assertEquals(data.length, 3);
});

Deno.test("sequence combinator (one or more)", () => {
	compare(sequence("a")($`aaa`), ["a", "a", "a"]);
	compare(sequence("a")($`a`), ["a"]);
	assertFail(sequence("a")($`b`));
	assertFail(sequence("a")($``));
	compare(sequence("ab")($`abab`), ["ab", "ab"]);
});

Deno.test("array combinator", () => {
	compare(array(3, "a")($`aaa`), ["a", "a", "a"]);
	compare(array(0, "a")($`aaa`), []);
	assertFail(array(3, "a")($`aa`));
	compare(array(3, "a")($`aaaa`), ["a", "a", "a"]);
});

Deno.test("atLeast combinator", () => {
	compare(atLeast(2, "a")($`aaa`), ["a", "a", "a"]);
	compare(atLeast(2, "a")($`aa`), ["a", "a"]);
	assertFail(atLeast(2, "a")($`a`));
	assertFail(atLeast(2, "a")($``));
	compare(atLeast(0, "a")($`aaa`), ["a", "a", "a"]);
});

Deno.test("atMost combinator", () => {
	compare(atMost(3, "a")($`aaa`), ["a", "a", "a"]);
	compare(atMost(3, "a")($`aaaaa`), ["a", "a", "a"]);
	compare(atMost(3, "a")($`a`), ["a"]);
	compare(atMost(0, "a")($`aaa`), []);
	compare(atMost(0, "a")($``), []);
});

Deno.test("all combinator", () => {
	compare(all("a")($`aaa`), ["a", "a", "a"]);
	compare(all("a")($``), []);
	assertFail(all("a")($`aab`));
	compare(all(literal("ab"))($`abab`), ["ab", "ab"]);
});

Deno.test("unordered combinator", () => {
	compare(unordered(literal("a"), literal("b"))($`ba`), ["a", "b"]);
	compare(unordered(literal("a"), literal("b"))($`ab`), ["a", "b"]);
	compare(unordered(literal("a"), literal("b"), literal("c"))($`cba`), ["a", "b", "c"]);
	compare(unordered(literal("a"), literal("b"), literal("c"))($`bac`), ["a", "b", "c"]);
});

Deno.test("unordered preserves index mapping", () => {
	const p = unordered(literal("x"), literal("y"), literal("z"));
	const result = assertSuccess(p($`zxy`));
	assertEquals(result[0], "x");
	assertEquals(result[1], "y");
	assertEquals(result[2], "z");
});

Deno.test("unordered fails on missing element", () => {
	assertFail(unordered(literal("a"), literal("b"))($`a`));
	assertFail(unordered(literal("a"), literal("b"), literal("c"))($`ab`));
});

Deno.test("unordered allows duplicate parsers at different indices", () => {
	compare(unordered(literal("a"), literal("a"))($`aa`), ["a", "a"]);
});

Deno.test("unordered leaves stream at last attempted position on failure", () => {
	const s = new StringStream("ab");
	assertFail(unordered(literal("a"), literal("c"))(s));
	assertEquals(s.position.offset, 1);
});

Deno.test("only combinator", () => {
	compare(only("a")($`a`), "a");
	compare(only("")($``), "");
	assertFail(only("a")($`a b`));
	assertFail(only("a")($` ab`));
});

Deno.test("between combinator", () => {
	compare(between("(", ")", "x")($`(x)`), "x");
	compare(between("[", "]", "hello")($`[hello]`), "hello");
	assertFail(between("(", ")", "x")($`(x`));
	assertFail(between("(", ")", "x")($`x)`));
});

Deno.test("between with content containing delimiter chars", () => {
	compare(between("'", "'", "it's")($`'it's'`), "it's");
});

Deno.test("surrounded combinator", () => {
	compare(surrounded('"', "hello")($`"hello"`), "hello");
	assertFail(surrounded('"', "x")($`"x`));
});

Deno.test("sepBy combinator", () => {
	compare(sepBy("a", ",")($`a,a,a`), ["a", "a", "a"]);
	compare(sepBy("a", ",")($`a`), ["a"]);
	compare(sepBy("a", ",")($`b`), []);
	compare(sepBy("a", ",")($``), []);
});

Deno.test("sepBy1 combinator", () => {
	compare(sepBy1("a", ",")($`a,a,a`), ["a", "a", "a"]);
	compare(sepBy1("a", ",")($`a`), ["a"]);
	assertFail(sepBy1("a", ",")($`b`));
	assertFail(sepBy1("a", ",")($``));
	assertFail(sepBy1("a", ",")($`,a`));
});

Deno.test("endBy combinator", () => {
	compare(endBy("a", ";")($`a;a;`), ["a", "a"]);
	compare(endBy("a", ";")($`a;`), ["a"]);
	compare(endBy("a", ";")($``), []);
	compare(endBy("a", ";")($`a;a`), ["a"]);
});

Deno.test("sepEndBy combinator", () => {
	compare(sepEndBy("a", ",")($`a,a,a,`), ["a", "a", "a"]);
	compare(sepEndBy("a", ",")($`a,a`), ["a", "a"]);
	compare(sepEndBy("a", ",")($`a,`), ["a"]);
	compare(sepEndBy("a", ",")($``), []);
	compare(sepEndBy("a", ",")($`a`), ["a"]);
});

Deno.test("token combinator", () => {
	compare(token("hello")($`   hello`), "hello");
	compare(token("hello")($`hello`), "hello");
	compare(token("hello")($`\thello`), "hello");
	compare(token("hello")($`hello world`), "hello");
});

Deno.test("attempt backtracking via pick", () => {
	const p = pick(literal("ab"), literal("a"));
	compare(p($`a bc`), "a");
	const s = new StringStream("a bc");
	p(s);
	assertEquals(s.peek(), " ");
});

Deno.test("discard does not consume input", () => {
	const s = new StringStream("abc");
	const result = discard(literal("ab"))(s);
	assertSuccess(result);
	assertEquals(s.peek(), "a"); // position unchanged
});

Deno.test("lookahead is alias for discard", () => {
	const s1 = new StringStream("abc");
	const s2 = new StringStream("abc");
	const r1 = discard(literal("ab"))(s1);
	const r2 = lookahead(literal("ab"))(s2);
	assertEquals(r1.kind, r2.kind);
	assertEquals(s1.position.offset, s2.position.offset);
});

Deno.test("negate combinator", () => {
	compare(negate("a")($`b`), null);
	compare(negate("a")($`123`), null);
	compare(negate("a")($``), null);
	assertFail(negate("a")($`a`));
	assertFail(negate("abc")($`abc`));
});

Deno.test("parser.map transforms value", () => {
	const mapped = literal("hello").map("mapped", (_, value) => yay(value + "!"));
	compare(mapped($`hello`), "hello!");
	assertFail(mapped($`world`));
});

Deno.test("parser.map receives current stream", () => {
	const mapped = literal("ab").map("len", (stream, _value) => {
		return yay(stream.position.offset);
	});
	compare(mapped($`ab`), 2);
});

Deno.test("parser.map pushes inner parser tag on error", () => {
	const mapped = literal("x").map("outer", (_, v) => yay(v));
	const err = assertFail(mapped($`y`));
	assertEquals(err.stack.length, 1);
	assertEquals(err.stack[0].parser, '"x"');
});

Deno.test("parser.map chained stack frames", () => {
	const p = literal("5")
		.map("num", (_, v) => yay(parseInt(v, 10)))
		.map("doubled", (_, v) => yay(v * 2));

	const err = assertFail(p($`x`));
	const tags = err.stack.map((f) => f.parser);
	assertEquals(tags[0], "num");
	assertEquals(tags[1], '"5"');
	assertEquals(tags.length, 2);
});

Deno.test("parser.label replaces expected in errors", () => {
	const labeled = literal("x").label("a letter x");
	const err = assertFail(labeled($`y`));
	assertEquals(err.expected, ["a letter x"]);
	assertEquals(err.message.includes("a letter x"), true);
});

Deno.test("combinator tags reflect structure", () => {
	assertEquals(literal("a").tag, '"a"');
	assertEquals(pick("a", "b").tag, 'pick("a", "b")');
	assertEquals(many("a").tag, '"a"*');
	assertEquals(optional("a").tag, '"a"?');
	assertEquals(sequence("a").tag, '"a"+');
	assertEquals(array(3, "a").tag, '"a"{3}');
	assertEquals(atLeast(2, "a").tag, '"a"{2,}');
	assertEquals(atMost(3, "a").tag, '"a"{,3}');
});
