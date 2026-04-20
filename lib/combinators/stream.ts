/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface Position {
	line: number; // 1-indexed
	column: number; // 1-indexed
	offset: number;
}

export interface Stream<T> {
	readonly position: Position;

	advance(): T | null;

	lookbehind(offset: number): T | null;

	peek(offset: number): T | null;

	/** save current position as a checkpoint */
	push(): void;

	/** discard the most recent checkpoint  */
	pop(): void;

	/** restore position to most recent checkpoint */
	restore(): void;

	get source(): T;
}

export class StringStream implements Stream<string> {
	position: Position = { line: 1, column: 1, offset: 0 };

	private readonly history: Position[] = [];

	constructor(private readonly input: string) {}

	advance(): string | null {
		if (this.position.offset === this.input.length) return null;
		const match = this.input[this.position.offset++];

		if (match == "\n") {
			this.position.line += 1;
			this.position.column = 1;
		} else {
			this.position.column++;
		}
		return match;
	}

	lookbehind(offset: number): string | null {
		const index = this.position.offset - offset;
		return index < 0 || index >= this.input.length ? null : this.input[index];
	}

	peek(offset: number = 0): string | null {
		const index = this.position.offset + offset;
		return index < 0 || index >= this.input.length ? null : this.input[index];
	}

	push(): void {
		this.history.push({ ...this.position });
	}

	pop(): void {
		if (!this.history.length) {
			throw new Error("no saved positions in history");
		}
		this.history.pop();
	}

	restore(): void {
		if (!this.history.length) {
			throw new Error("no saved positions in history");
		}
		this.position = this.history.pop()!;
	}

	tail(): string {
		return this.input.slice(this.position.offset);
	}

	get source(): string {
		return this.input;
	}

	isEOF(): boolean {
		return this.position.offset >= this.input.length;
	}

	slice(start: number, end: number = this.position.offset): string {
		return this.input.slice(start, end);
	}

	consumeWhile(predicate: (char: string) => boolean): string {
		const start = this.position.offset;
		while (!this.isEOF()) {
			const char = this.peek();
			if (!char || !predicate(char)) break;
			this.advance();
		}
		return this.input.slice(start, this.position.offset);
	}

	skipWhitespace(): void {
		this.consumeWhile((char) => /\s/.test(char));
	}

	matches(str: string): boolean {
		const end = this.position.offset + str.length;
		return end <= this.input.length &&
			this.input.slice(this.position.offset, end) === str;
	}

	expect(str: string): boolean {
		if (this.matches(str)) {
			for (let i = 0; i < str.length; i++) {
				this.advance();
			}
			return true;
		}
		return false;
	}

	get currentLine(): string {
		const lines = this.input.split("\n");
		return lines[this.position.line - 1] || "";
	}

	clone(): StringStream {
		const cloned = new StringStream(this.input);
		return cloned.position = { ...this.position }, cloned;
	}
}

export function $(
	strings: TemplateStringsArray,
	...values: any[]
): StringStream {
	let input = "";
	for (let index = 0; index < strings.length; index++) {
		input += strings[index];
		if (index < values.length) {
			input += values[index];
		}
	}
	return new StringStream(input);
}
