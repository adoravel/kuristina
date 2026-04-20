/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { assertEquals } from "@std/assert";
import { $, StringStream } from "~combinators/stream.ts";
import {
	alpha,
	alphanumeric,
	binary,
	digit,
	greedyString,
	hex,
	identifier,
	int,
	line,
	lowercase,
	nat,
	number,
	octal,
	uppercase,
	word,
} from "~combinators/primitives.ts";
import { assertFail, assertSuccess, compare } from "./mod.ts";

Deno.test("digit parser", () => {
	for (const d of "0123456789") {
		compare(digit($`${d}`), d);
	}
	assertFail(digit($`a`));
	assertFail(digit($``));
	assertFail(digit($` `));
});

Deno.test("lowercase parser", () => {
	for (let i = 0; i < 26; i++) {
		const c = String.fromCharCode(97 + i);
		compare(lowercase($`${c}`), c);
	}
	assertFail(lowercase($`A`));
	assertFail(lowercase($`0`));
});

Deno.test("uppercase parser", () => {
	for (let i = 0; i < 26; i++) {
		const c = String.fromCharCode(65 + i);
		compare(uppercase($`${c}`), c);
	}
	assertFail(uppercase($`a`));
	assertFail(uppercase($`0`));
});

Deno.test("alpha parser", () => {
	compare(alpha($`a`), "a");
	compare(alpha($`Z`), "Z");
	assertFail(alpha($`0`));
	assertFail(alpha($`_`));
	assertFail(alpha($` `));
});

Deno.test("alphanumeric parser", () => {
	compare(alphanumeric($`a`), "a");
	compare(alphanumeric($`Z`), "Z");
	compare(alphanumeric($`0`), "0");
	compare(alphanumeric($`9`), "9");
	assertFail(alphanumeric($`_`));
	assertFail(alphanumeric($`-`));
});

Deno.test("nat parser", () => {
	compare(nat($`0`), 0);
	compare(nat($`123`), 123);
	compare(nat($`999999`), 999999);
	compare(nat($`123abc`), 123);
	assertFail(nat($`-1000`));
	assertFail(nat($`abc`));
	assertFail(nat($``));
	assertFail(nat($` `));
});

Deno.test("int parser", () => {
	compare(int($`123`), 123);
	compare(int($`-456`), -456);
	compare(int($`+789`), 789);
	compare(int($`0`), 0);
	compare(int($`-0`), 0);
	compare(int($`+0`), 0);
	compare(int($`42 rest`), 42);
	assertFail(int($`-abc`));
	assertFail(int($`+abc`));
	assertFail(int($`abc`));
	assertFail(int($``));
});

Deno.test("binary parser", () => {
	compare(binary($`0b1010`), 10);
	compare(binary($`0B1111`), 15);
	compare(binary($`0b0`), 0);
	compare(binary($`0b1`), 1);
	assertFail(binary($`0b`));
	assertFail(binary($`0b2`));
	assertFail(binary($`1010`));
	assertFail(binary($`0x1010`));
});

Deno.test("hex parser", () => {
	compare(hex($`0xff`), 255);
	compare(hex($`0xFF`), 255);
	compare(hex($`0XaB`), 171);
	compare(hex($`#ff00ff`), 16711935);
	compare(hex($`0x0`), 0);
	compare(hex($`#abc`), 2748);
	assertFail(hex($`0x`));
	assertFail(hex($`#`));
	assertFail(hex($`ff`));
	assertFail(hex($`0b1010`));
});

Deno.test("octal parser", () => {
	compare(octal($`0o777`), 511);
	compare(octal($`0O777`), 511);
	compare(octal($`0o0`), 0);
	compare(octal($`0o17`), 15);
	assertFail(octal($`0o`));
	assertFail(octal($`0o89`));
	assertFail(octal($`777`));
});

Deno.test("number parser tries hex, octal, binary, int in order", () => {
	compare(number($`0xff`), 255);
	compare(number($`0o77`), 63);
	compare(number($`0b1010`), 10);
	compare(number($`42`), 42);
	compare(number($`-7`), -7);
	compare(number($`#abc`), 2748);
});

Deno.test("word parser", () => {
	compare(word($`hello`), "hello");
	compare(word($`test123`), "test123");
	compare(word($`hello world`), "hello");
	compare(word($`hello\tworld`), "hello");
	compare(word($`a`), "a");
	assertFail(word($` `));
	assertFail(word($`\t`));
	assertFail(word($`\n`));
	assertFail(word($``));
});

Deno.test("identifier parser", () => {
	compare(identifier($`hello`), "hello");
	compare(identifier($`_private`), "_private");
	compare(identifier($`camelCase`), "camelCase");
	compare(identifier($`snake_case`), "snake_case");
	compare(identifier($`kebab-case`), "kebab-case");
	compare(identifier($`a1b2`), "a1b2");
	compare(identifier($`_`), "_");
	compare(identifier($`a_b-c1`), "a_b-c1");
	assertFail(identifier($`123abc`));
	assertFail(identifier($`-start`));
	assertFail(identifier($``));
});

Deno.test("greedyString parser", () => {
	compare(greedyString($`eat everything`), "eat everything");
	compare(greedyString($``), "");
	compare(greedyString($`   leading spaces`), "   leading spaces");
	compare(greedyString($`special !@#$%^&*() chars`), "special !@#$%^&*() chars");
});

Deno.test("line parser", () => {
	compare(line($`hello`), "hello");
	compare(line($`hello\nworld`), "hello");
	compare(line($`hello\n`), "hello");
	compare(line($``), "");
	compare(line($`\n`), "");
});

Deno.test("line consumes the newline", () => {
	const s = new StringStream("first\nsecond");
	const r1 = line(s);
	assertSuccess(r1);
	assertEquals(r1.data, "first");
	assertEquals(s.peek(), "s");
});
