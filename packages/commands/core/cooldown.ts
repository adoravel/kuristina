/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { TimedMap } from "@kuristina/core";

export class CommandCooldownOrchestrator {
	private readonly commands = new Map<string, TimedMap<bigint, boolean>>();

	constructor(
		private readonly defaultCleanupIntervalMs: number = 1000,
	) {}

	private getOrCreateMap(commandName: string, cooldownMs: number): TimedMap<bigint, boolean> {
		let map = this.commands.get(commandName);
		if (!map) {
			map = new TimedMap<bigint, boolean>(cooldownMs, this.defaultCleanupIntervalMs);
			this.commands.set(commandName, map);
		}
		return map;
	}

	public check(userId: bigint, commandName: string): boolean {
		const map = this.commands.get(commandName);
		if (!map) return true;
		return map.getRemainingMs(userId, Date.now()) <= 0;
	}

	public getRemainingMs(userId: bigint, commandName: string): number {
		const map = this.commands.get(commandName);
		if (!map) return 0;
		return map.getRemainingMs(userId, Date.now());
	}

	public set(userId: bigint, commandName: string, cooldownMs: number): void {
		const map = this.getOrCreateMap(commandName, cooldownMs);
		map.set(userId, true);
	}

	public clearUser(userId: bigint, commandName: string): void {
		this.commands.get(commandName)?.delete(userId);
	}

	public clearCommand(commandName: string): void {
		this.commands.get(commandName)?.clear();
		this.commands.delete(commandName);
	}
}
