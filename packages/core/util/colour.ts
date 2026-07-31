import { rgb } from "culori";

export function parseColour(raw: unknown): number | undefined {
	if (typeof raw === "number") {
		return Number.isInteger(raw) && raw >= 0 && raw <= 0xffffff ? raw : undefined;
	}

	if (typeof raw !== "string") return undefined;

	let input = raw.trim();
	if (input.startsWith("0x")) {
		input = "#" + input.slice(2);
	}

	const colour = rgb(input);
	if (!colour) return undefined;

	const r = Math.round(Math.max(0, Math.min(1, colour.r)) * 255);
	const g = Math.round(Math.max(0, Math.min(1, colour.g)) * 255);
	const b = Math.round(Math.max(0, Math.min(1, colour.b)) * 255);

	return (r << 16) + (g << 8) + b;
}
