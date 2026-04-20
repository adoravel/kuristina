/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ParsingResult } from "./mod.ts";
import { StringStream } from "./stream.ts";

export type Input = StringStream;

export type ParsingError = {
	position: ErrorPosition;
	expected: string[];
	found: string;
	message: string;
	context?: ErrorContext;
	stack: ParserStackFrame[];
};

export type ErrorPosition = {
	offset: number;
	line: number;
	column: number;
};

export type ErrorContext = {
	before: string;
	at: string;
	after: string;
	line: string;
	pointerColumn: number;
};

export type ParserStackFrame = {
	parser?: string;
	position: ErrorPosition;
};

export const yay = <T>(
	data: T,
): ParsingResult<T> => ({ kind: "success", data } as ParsingResult<T>);

export const boo = (
	position: ErrorPosition,
	expected: (string | undefined)[],
	found: string,
	message?: string,
	context?: ErrorContext,
	stack: ParserStackFrame[] = [],
): ParsingResult<never> => {
	expected = expected.map((x) => x || "<anon>");
	const error: ParsingError = {
		position,
		expected: expected as string[],
		found,
		message: message || buildDefaultMessage(expected as string[], found, position),
		context,
		stack,
	};
	return { kind: "error", data: error };
};

export function buildDefaultMessage(
	expected: string[],
	found: string,
	position: ErrorPosition,
): string {
	const exp = expected.length === 1
		? expected[0]
		: expected.length === 2
		? `${expected[0]} or ${expected[1]}`
		: `one of: ${expected.join(", ")}`;

	return `Expected ${exp} at line ${position.line}, column ${position.column}, but found '${found}'`;
}

export function getPosition(input: Input): ErrorPosition {
	return {
		offset: input.position.offset,
		line: input.position.line,
		column: input.position.column,
	};
}

export function getContext(input: Input, radius = 20): ErrorContext {
	const src = input.source;
	const pos = input.position.offset;

	const before = src.slice(Math.max(0, pos - radius), pos);
	const at = src[pos] || "<EOF>";
	const after = src.slice(pos + 1, Math.min(src.length, pos + radius + 1));

	return {
		before: before.replace(/\n/g, "\\n").replace(/\t/g, "\\t"),
		at: at === "\n" ? "\\n" : at === "\t" ? "\\t" : at,
		after: after.replace(/\n/g, "\\n").replace(/\t/g, "\\t"),
		line: input.currentLine,
		pointerColumn: input.position.column,
	};
}

export function expectedEoi(input: Input, stack: ParserStackFrame[] = []) {
	const remaining = input.tail();
	const preview = remaining.length > 20 ? remaining.slice(0, 20) + "..." : remaining;

	return boo(
		getPosition(input),
		["end of input"],
		preview,
		`Expected end of input but found '${preview}'`,
		getContext(input),
		stack,
	);
}

export function unexpectedEoi(
	input: Input,
	expected: (string | undefined)[],
	stack: ParserStackFrame[] = [],
) {
	return boo(
		getPosition(input),
		expected,
		"<EOF>",
		`Unexpected end of input, expected ${expected.join(" or ")}`,
		undefined,
		stack,
	);
}

export function unexpectedSymbol(
	input: Input,
	expected: (string | undefined)[],
	stack: ParserStackFrame[] = [],
) {
	const found = input.peek() || input.lookbehind(1) || "<unknown>";
	return boo(
		getPosition(input),
		expected,
		found,
		undefined,
		getContext(input),
		stack,
	);
}

export function error(
	input: Input,
	message: string,
	expected: (string | undefined)[] = [],
	stack: ParserStackFrame[] = [],
) {
	return boo(
		getPosition(input),
		expected,
		input.peek() || "<EOF>",
		message,
		getContext(input),
		stack,
	);
}

export function mergeErrors(errors: ParsingError[]): ParsingError {
	if (!errors.length) {
		throw new Error("cannot merge zero errors");
	}
	if (errors.length === 1) {
		return errors[0];
	}

	const furthest = errors.reduce((a, b) => a.position.offset > b.position.offset ? a : b);

	const allExpected = errors
		.filter((e) => e.position.offset === furthest.position.offset)
		.flatMap((e) => e.expected);

	const combinedStack: ParserStackFrame[] = [];
	const seenFrames = new Set<string>();

	for (const error of errors) {
		for (const frame of error.stack) {
			const key = `${frame.parser || "<anon>"}@${frame.position.offset}`;
			if (!seenFrames.has(key)) {
				seenFrames.add(key);
				combinedStack.push(frame);
			}
		}
	}

	return {
		...furthest,
		expected: [...new Set(allExpected)].sort(),
		message: buildDefaultMessage(
			[...new Set(allExpected)],
			furthest.found,
			furthest.position,
		),
		stack: combinedStack,
	};
}

export function prettify(err: ParsingError): string {
	const lines: string[] = [];

	lines.push("| Parse Error ");
	lines.push("|");
	lines.push(`| ${err.message}`);
	lines.push("|");

	lines.push(
		`| Location: line ${err.position.line}, column ${err.position.column} (offset ${err.position.offset})`,
	);

	if (err.context) {
		lines.push("|");
		lines.push("| Context:");
		lines.push(
			`|   ${err.context.before}«${err.context.at}»${err.context.after}`,
		);
		lines.push(`|   ${" ".repeat(err.context.before.length)}^`);

		if (err.context.line) {
			lines.push("|");
			lines.push("| Current line:");
			lines.push(`|   ${err.context.line}`);
			lines.push(`|   ${" ".repeat(err.context.pointerColumn)}^`);
		}
	}

	if (err.expected.length > 0) {
		lines.push("|");
		lines.push("| Expected:");
		err.expected.forEach((exp) => lines.push(`|   • ${exp}`));
	}

	lines.push("|");
	lines.push(`| Found: '${err.found}'`);

	if (err.stack.length > 0) {
		lines.push("|");
		lines.push("| Parser Stack:");
		err.stack.forEach((frame, i) => {
			lines.push(
				`|   ${i + 1}. ${
					frame.parser || "<anon>"
				} @ line ${frame.position.line}:${frame.position.column}`,
			);
		});
	}

	return lines.join("\n");
}
