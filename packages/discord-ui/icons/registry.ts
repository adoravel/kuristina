/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

export type IconProvider = "lucide" | "heroicons";
export type IconVariant = "default" | "success" | "danger";

interface BaseIconRegistration {
	readonly provider: IconProvider;
	readonly name: string;
	readonly variant?: IconVariant;
}

export interface HeroiconRegistration extends BaseIconRegistration {
	readonly provider: "heroicons";
	readonly style?: "solid" | "outline";
}

export interface LucideIconRegistration extends BaseIconRegistration {
	readonly provider: "lucide";
	readonly strokeWidth?: number;
}

export type IconRegistration = LucideIconRegistration | HeroiconRegistration;

export const registeredIcons = {
	music: { provider: "lucide", name: "music", strokeWidth: 2 },
	link: { provider: "lucide", name: "link" },
	check: { provider: "lucide", name: "check", variant: "success" },
	x: { provider: "heroicons", name: "x-mark", variant: "danger", style: "outline" },
	users: { provider: "heroicons", name: "users", style: "solid" },
	crown: { provider: "lucide", name: "crown" },
} as const satisfies Record<string, IconRegistration>;

export type RegisteredIconName = keyof typeof registeredIcons;

export const VENDORED_ICONS_DIR = new URL("./vendored/", import.meta.url);
