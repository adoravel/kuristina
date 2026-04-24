import type { FieldError } from "~/config/errors.ts";

export class Field<T> {
	constructor(
		readonly parse: (raw: unknown, path: string, errors: FieldError[]) => T | undefined,
		readonly tomlKey?: string,
	) {}
}

export type SchemaBranch = { readonly [key: string]: Field<any> | SchemaBranch };

export type Infer<S> = S extends Field<infer T> ? T
	: S extends SchemaBranch ? { [K in keyof S]: Infer<S[K]> }
	: never;

function camelToSnake(s: string): string {
	return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function parseSchema<T extends SchemaBranch>(
	schema: T,
	raw: Record<string, unknown>,
	basePath: string,
	errors: FieldError[],
): Infer<T> {
	const result: any = {};

	for (const [key, def] of Object.entries(schema)) {
		const rawKey = def instanceof Field ? (def.tomlKey ?? camelToSnake(key)) : camelToSnake(key);
		const path = basePath ? `${basePath}.${rawKey}` : rawKey;

		if (def instanceof Field) {
			result[key] = def.parse(raw[rawKey], path, errors);
		} else {
			const nested = raw[rawKey];
			result[key] = parseSchema(
				def as SchemaBranch,
				nested && typeof nested === "object" && !Array.isArray(nested)
					? nested as Record<string, unknown>
					: {},
				path,
				errors,
			);
		}
	}

	return result;
}

const make = <T>(
	parse: (raw: unknown, path: string, errors: FieldError[]) => T | undefined,
	tomlKey?: string,
): Field<T> => new Field(parse, tomlKey);

export const field = {
	string: (): Field<string> =>
		make((raw, path, errors) => {
			if (typeof raw === "string" && raw.trim().length) return raw.trim();
			errors.push({
				path,
				message: raw === undefined
					? "required field is missing"
					: `expected a non-empty string, got ${JSON.stringify(raw)}`,
			});
		}),

	stringOr: (fallback: string): Field<string> =>
		make((raw) => typeof raw === "string" && raw.trim().length ? raw.trim() : fallback),

	snowflake: (): Field<bigint> =>
		make((raw, path, errors) => {
			const str = typeof raw === "string"
				? raw.trim()
				: typeof raw === "number"
				? String(raw)
				: undefined;

			if (!str) {
				errors.push({ path, message: "required field is missing" });
				return;
			}
			try {
				const n = BigInt(str);
				if (n <= BigInt(Number.MAX_SAFE_INTEGER)) {
					errors.push({ path, message: `suspiciously small snowflake: ${str}` });
					return;
				}
				return n;
			} catch {
				errors.push({ path, message: `could not parse as bigint: ${JSON.stringify(str)}` });
			}
		}),

	snowflakeOr: (fallback: bigint): Field<bigint> =>
		make((raw) => {
			const str = typeof raw === "string"
				? raw.trim()
				: typeof raw === "number"
				? String(raw)
				: undefined;
			if (!str) return fallback;
			try {
				return BigInt(str);
			} catch {
				return fallback;
			}
		}),

	positiveInt: (fallback: number): Field<number> =>
		make((raw, path, errors) => {
			if (raw === undefined) return fallback;
			if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) return raw;
			errors.push({ path, message: `expected a positive integer, got ${JSON.stringify(raw)}` });
			return fallback;
		}),

	boolean: (fallback: boolean): Field<boolean> =>
		make((raw, path, errors) => {
			if (raw === undefined) return fallback;
			if (typeof raw === "boolean") return raw;
			errors.push({ path, message: `expected a boolean, got ${JSON.stringify(raw)}` });
			return fallback;
		}),

	// for dynamic tables like commands = { ping = true, help = false }
	record: <T>(valueField: Field<T>): Field<Record<string, T>> =>
		make((raw, path, errors) => {
			if (raw === undefined) return {};
			if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
				errors.push({ path, message: `expected a table, got ${JSON.stringify(raw)}` });
				return {};
			}
			const result: Record<string, T> = {};
			for (const [k, v] of Object.entries(raw)) {
				const val = valueField.parse(v, `${path}.${k}`, errors);
				if (val !== undefined) result[k] = val;
			}
			return result;
		}),
};
