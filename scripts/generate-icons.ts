#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-sys --allow-ffi --allow-env

// deno-lint-ignore no-import-prefix
import { Resvg } from "npm:@resvg/resvg-js@^2.6.2";

import { type IconRegistration, registeredIcons } from "@kuristina/discord-ui";
import { fetchWithRetry } from "@kuristina/core";

const DIR = "./packages/discord-ui/icons/vendored";

const PALETTE = {
	bg: "#1e2126",
	fg: "#b9bbc7",
	success: "#57f287",
	danger: "#ed4245",
} as const;

const SIZE = 128;
const PADDING = 24;
const CORNER_RADIUS = 28;

function extract(rawSvg: string, iconName: string): string {
	const match = rawSvg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
	if (!match) {
		throw new Error(`Could not extract inner content from icon "${iconName}"`);
	}
	return match[1].trim();
}

function compose(glyphInner: string, config: IconRegistration): string {
	const glyphSize = SIZE - PADDING * 2;
	const variant = config.variant ?? "default";

	const fg = variant === "default" ? PALETTE.fg : PALETTE[variant];
	let groupAttributes: string;

	if (config.provider === "heroicons" && config.style === "solid") {
		groupAttributes = `fill="${fg}"`;
	} else {
		const strokeWidth = config.provider === "lucide" && config.strokeWidth ? config.strokeWidth : 2;
		groupAttributes =
			`stroke="${fg}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
	}

	return `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
	<rect width="${SIZE}" height="${SIZE}" rx="${CORNER_RADIUS}" fill="${PALETTE.bg}"/>
	<g transform="translate(${PADDING}, ${PADDING})" ${groupAttributes}>
		<svg width="${glyphSize}" height="${glyphSize}" viewBox="0 0 24 24">${glyphInner}</svg>
	</g>
</svg>`.trim();
}

async function fetchIconContent(config: IconRegistration): Promise<string> {
	let url = "";

	if (config.provider === "lucide") {
		url = `https://unpkg.com/lucide-static/icons/${config.name}.svg`;
	} else if (config.provider === "heroicons") {
		const style = config.style ?? "outline";
		const directory = style === "solid" ? "24/solid" : "24/outline";
		url = `https://unpkg.com/heroicons/${directory}/${config.name}.svg`;
	}

	const response = await fetchWithRetry<string>(url, { json: false });
	if (!response.ok) throw response.error;

	return extract(response.value, config.name);
}

async function process(name: string, config: IconRegistration) {
	try {
		const innerSvg = await fetchIconContent(config);
		const finalSvgString = compose(innerSvg, config);

		const resvg = new Resvg(finalSvgString, {
			fitTo: { mode: "original" },
		});

		const pngData = resvg.render();
		const pngBuffer = pngData.asPng();

		const destPath = `${DIR}/${name}.png`;
		await Deno.writeFile(destPath, new Uint8Array(pngBuffer));

		console.log(`generated ${destPath} (from ${config.provider}:${config.name})`);
	} catch (error) {
		console.error(
			`failed to generate "${name}":`,
			error instanceof Error ? error.message : error,
		);
		throw error;
	}
}

async function main() {
	const tasks = Object.entries(registeredIcons).map(([name, config]) =>
		process(name, config as IconRegistration)
	);

	await Promise.all(tasks);

	console.log(`successfully generated ${tasks.length} png icons`);
}

if (import.meta.main) await main();
