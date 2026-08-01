/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { gray, green } from "./colours.ts";

export function progressBar(pct: number, width = 30): string {
	const clamped = Math.max(0, Math.min(1, pct));
	const filledLen = Math.floor(clamped * width);
	const emptyLen = width - filledLen;

	const filled = "█".repeat(filledLen);
	const empty = "░".repeat(emptyLen);
	return `${gray("[")}${green(filled)}${gray(empty)}${gray("]")}`;
}

export function formatBytes(bytes: number): string {
	if (bytes < 0) return "0 B";
	const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"];
	let value = bytes;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex++;
	}
	return unitIndex === 0
		? `${Math.round(value)} ${units[unitIndex]}`
		: `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function formatETA(remainingBytes: number, bytesPerSec: number): string {
	if (remainingBytes <= 0 || bytesPerSec <= 0) return "0s";
	const secs = Math.floor(remainingBytes / bytesPerSec);
	if (secs < 60) return `${secs}s`;
	const mins = Math.floor(secs / 60);
	const remainingSecs = secs % 60;
	if (mins < 60) return `${mins}m ${remainingSecs}s`;
	const hrs = Math.floor(mins / 60);
	const remainingMins = mins % 60;
	return `${hrs}h ${remainingMins}m`;
}
