#!/usr/bin/env -S deno run --allow-read --allow-write

import { HeroiconRegistration, registeredIcons } from "../packages/discord-ui/icons/registry.ts";

const PALETTE = {
	bg: "#1e2126",
	fg: "#b9bbc7",
	success: "#57f287",
	danger: "#ed4245",
} as const;

const SIZE = 128;
const PADDING = 24;
const CORNER_RADIUS = 28;

function composedSvg(
	glyphInner: string,
	fg: string,
	provider: "lucide" | "heroicons",
	style?: "solid" | "outline",
): string {
	const glyphSize = SIZE - PADDING * 2;

	const viewBox = provider === "heroicons" && style === "solid" ? "0 0 24 24" : "0 0 24 24";

	const isSolid = provider === "heroicons" && style === "solid";
	const groupAttributes = isSolid
		? `fill="${fg}"`
		: `stroke="${fg}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"`;

	return `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
	<rect width="${SIZE}" height="${SIZE}" rx="${CORNER_RADIUS}" fill="${PALETTE.bg}"/>
	<g transform="translate(${PADDING}, ${PADDING})" ${groupAttributes}>
		<svg width="${glyphSize}" height="${glyphSize}" viewBox="${viewBox}">${glyphInner}</svg>
	</g>
</svg>`.trim();
}

function extractSvgInner(rawSvg: string, iconName: string): string {
	const match = rawSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
	if (!match) throw new Error(`could not extract inner content from icon "${iconName}"`);
	return match[1];
}

async function loadLucideGlyphInner(id: string): Promise<string> {
	const url = `https://unpkg.com/lucide-static/icons/${id}.svg`;
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to fetch Lucide icon "${id}" from unpkg.com`);
	const raw = await response.text();
	return extractSvgInner(raw, id);
}

async function loadHeroiconGlyphInner(
	id: string,
	style: "solid" | "outline" = "outline",
): Promise<string> {
	const directory = style === "solid" ? "24/solid" : "24/outline";

	const url = `https://unpkg.com/heroicons/${directory}/${id}.svg`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch Heroicon "${id}" (${style}) from unpkg.com`);
	}
	const raw = await response.text();
	return extractSvgInner(raw, id);
}

async function main() {
	await Deno.mkdir("build/icons", { recursive: true });

	for (const [name, config] of Object.entries(registeredIcons)) {
		const { provider, name: iconName, variant } = config as HeroiconRegistration;

		const fg = variant === "success"
			? PALETTE.success
			: variant === "danger"
			? PALETTE.danger
			: PALETTE.fg;

		let inner = "";
		if ((provider as string) === "lucide") {
			inner = await loadLucideGlyphInner(iconName);
		} else if (provider === "heroicons") {
			const style = "style" in config ? config.style : "outline";
			inner = await loadHeroiconGlyphInner(iconName, style);
		}

		const style = "style" in config ? config.style : undefined;
		const svg = composedSvg(inner, fg, provider, style);

		await Deno.writeTextFile(`build/icons/${name}.svg`, svg);
		console.log(
			`  · generated build/icons/${name}.svg (from ${provider}:${iconName}, variant:${variant})`,
		);
	}
}

if (import.meta.main) await main();
