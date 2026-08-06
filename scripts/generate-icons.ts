#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-sys --allow-ffi --allow-env

// deno-lint-ignore no-import-prefix
import { Resvg } from "npm:@resvg/resvg-js@^2.6.2";
import { type IconRegistration, registeredIcons, VENDORED_ICONS_DIR } from "@kuristina/discord-ui";
import { fetchWithRetry, mapWithConcurrency } from "@kuristina/core";

const SIZE = 128;
const PADDING = 24;
const CORNER_RADIUS = 28;

const PALETTE = {
	bg: "#1e2126",
	fg: "#b9bbc7",
	success: "#57f287",
	danger: "#ed4245",
	warn: "#facc15",
} as const;

type PaletteColor = keyof typeof PALETTE;
type HttpUrl = `http://${string}` | `https://${string}`;

const isUrl = (s: string): s is HttpUrl => s.startsWith("http://") || s.startsWith("https://");

const isPngSource = (config: IconRegistration, url: string): boolean =>
	("png" in config && typeof config.png === "string") ||
	url.startsWith("data:image/png") ||
	/\.png(\?.*)?$/i.test(url);

const resolveProviderUrl = (config: IconRegistration): string => {
	switch (config.provider) {
		case "lucide":
			return `https://unpkg.com/lucide-static/icons/${config.name}.svg`;
		case "heroicons": {
			const style = config.style ?? "outline";
			const dir = style === "solid" ? "24/solid" : "24/outline";
			return `https://unpkg.com/heroicons/${dir}/${config.name}.svg`;
		}
		case "simpleicons":
			return `https://simpleicons.org/icons/${config.name}.svg`;
		default:
			return config.name ? `${config.provider}/${config.name}.svg` : config.provider;
	}
};

const getVariantColor = (variant: string = "default"): string =>
	variant in PALETTE ? PALETTE[variant as PaletteColor] : PALETTE.fg;

const buildSvgAttributes = (config: IconRegistration, fgColor: string): string => {
	const style = "style" in config ? config.style : undefined;
	const strokeWidth = "strokeWidth" in config ? config.strokeWidth : 2;

	const isSolid = config.provider === "simpleicons" ||
		(config.provider === "heroicons" && style === "solid") ||
		(isUrl(config.provider) && style !== "outline");

	if (isSolid) {
		return `fill="${fgColor}"`;
	}

	const finalStrokeWidth = (config.provider === "lucide" || isUrl(config.provider))
		? (strokeWidth ?? 2)
		: 2;

	return `stroke="${fgColor}" stroke-width="${finalStrokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
};

const extractSvgInner = (rawSvg: string): string => {
	const match = rawSvg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
	if (!match) throw new Error("Could not extract inner content from SVG format.");
	return match[1].trim();
};

const composeSvg = (innerSvg: string, groupAttributes: string): string => {
	const glyphSize = SIZE - PADDING * 2;
	return `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
	<rect width="${SIZE}" height="${SIZE}" rx="${CORNER_RADIUS}" fill="${PALETTE.bg}"/>
	<g transform="translate(${PADDING}, ${PADDING})" ${groupAttributes}>
		<svg width="${glyphSize}" height="${glyphSize}" viewBox="0 0 24 24">${innerSvg}</svg>
	</g>
</svg>`.trim();
};

const renderToPng = (svgData: string): Uint8Array => {
	const resvg = new Resvg(svgData, { fitTo: { mode: "original" } });
	return resvg.render().asPng();
};

const fetchSvg = async (url: string): Promise<string> => {
	const response = await fetchWithRetry<string>(url, { json: false });
	if (!response.ok) throw new Error(String(response.error));
	return response.value;
};

const fetchPngBuffer = async (url: string, config: IconRegistration): Promise<Uint8Array> => {
	if ("png" in config && typeof config.png === "string") {
		const b64 = config.png.includes(",") ? config.png.split(",")[1] : config.png;
		return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
	}

	if (url.startsWith("data:")) {
		const parts = url.split(",");
		if (parts.length < 2) throw new Error("Invalid data URI");
		const b64 = parts[1];
		return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
	}

	const resp = await fetch(url);
	if (!resp.ok) throw new Error(`Failed to fetch PNG: ${resp.status}`);
	const buffer = await resp.arrayBuffer();
	return new Uint8Array(buffer);
};

const ensureDirectory = async (dirPath: string | URL): Promise<void> => {
	try {
		await Deno.mkdir(dirPath, { recursive: true });
	} catch (error) {
		if (!(error instanceof Deno.errors.AlreadyExists)) throw error;
	}
};

const savePng = async (destPath: string | URL, data: Uint8Array): Promise<void> => {
	await Deno.writeFile(destPath, data);
};

const processIcon = async (
	force: boolean,
	[name, config]: [string, IconRegistration],
): Promise<void> => {
	const destUrl = new URL(`${name}.png`, VENDORED_ICONS_DIR);

	if (!force) {
		try {
			return void await Deno.stat(destUrl);
		} catch { /* no-op */ }
	}

	try {
		const url = resolveProviderUrl(config);

		if (isPngSource(config, url)) {
			const pngBuffer = await fetchPngBuffer(url, config);
			await savePng(destUrl, pngBuffer);
			const source = url.startsWith("data:")
				? "Base64 data URI"
				: "png" in config
				? "Embedded base64"
				: "Direct PNG URL";
			return logger.yay(`generated ${destUrl.pathname} (from ${source})`);
		}

		const rawSvg = await fetchSvg(url);
		const innerSvg = extractSvgInner(rawSvg);
		const fgColor = getVariantColor(config.variant);
		const attributes = buildSvgAttributes(config, fgColor);
		const finalSvg = composeSvg(innerSvg, attributes);

		const pngBuffer = renderToPng(finalSvg);
		await savePng(destUrl, pngBuffer);

		const source = isUrl(config.provider) ? "Direct URL" : `${config.provider}(${config.name})`;
		logger.yay(`generated ${destUrl.pathname} (from ${source})`);
	} catch (error) {
		logger.boo(`Failed to generate "${name}":`, error);
		throw error;
	}
};

export async function generateMissingIcons(
	opts: { force?: boolean } = {},
): Promise<{ generated: number; skipped: number; failed: number }> {
	await ensureDirectory(VENDORED_ICONS_DIR);

	const entries = Object.entries(registeredIcons) as [string, IconRegistration][];
	let skipped = 0;

	if (opts.force === false) {
		for (const [name] of entries) {
			try {
				await Deno.stat(new URL(`${name}.png`, VENDORED_ICONS_DIR));
				skipped++;
			} catch { /* no-op */ }
		}
	}

	const results = await mapWithConcurrency(entries, 10, (x) => processIcon(opts.force ?? false, x));
	const generated = results.filter((r) => r.status === "fulfilled").length - skipped;
	const failed = results.filter((r) => r.status === "rejected").length;

	return { generated: Math.max(0, generated), skipped, failed };
}

async function main() {
	logger.info("starting icon generation pipeline");

	const { generated, skipped, failed } = await generateMissingIcons({
		force: Deno.args.includes("--force"),
	});
	logger.yay(`icons: ${generated} generated, ${skipped} already vendored, ${failed} failed`);
	if (failed > 0) Deno.exit(1);
}

if (import.meta.main) await main();
