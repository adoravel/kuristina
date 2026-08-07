import en from "./locales/en.json" with { type: "json" };

export type Locale = "en";

const BUNDLES: Record<Locale, Record<string, string>> = { en };
const DEFAULT_LOCALE: Locale = "en";

let activeLocale: Locale = DEFAULT_LOCALE;

export function setDefaultLocale(locale: Locale): void {
	activeLocale = locale;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
	if (!params) return template;
	return template.replace(
		/\{(\w+)\}/g,
		(match, name) => name in params ? String(params[name]) : match,
	);
}

export function t(
	key: string,
	params?: Record<string, string | number>,
	locale: Locale = activeLocale,
): string {
	const template = BUNDLES[locale]?.[key] ?? BUNDLES[DEFAULT_LOCALE]?.[key];
	if (template === undefined) {
		logger.warn(`i18n: missing key "${key}" for locale "${locale}"`);
		return key;
	}
	return interpolate(template, params);
}

export function isTranslationKey(text: string): boolean {
	return /^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(text) && text in BUNDLES[DEFAULT_LOCALE];
}

export function resolveIfKey(
	text: string,
	params?: Record<string, string | number>,
	locale?: Locale,
): string {
	return isTranslationKey(text) ? t(text, params, locale) : text;
}
