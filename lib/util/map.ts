/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export class TimedMap<K, V> extends Map<K, V> {
	private readonly timers = new Map<K, number>();

	public constructor(
		public readonly lifeDuration: number,
		private readonly onExpire?: (key: K, value: V) => void,
	) {
		super();
	}

	public override set(key: K, value: V) {
		if (this.timers.has(key)) {
			clearTimeout(this.timers.get(key));
		}

		const id = setTimeout(() => {
			this.delete(key);
			this.onExpire?.(key, value);
		}, this.lifeDuration);
		this.timers.set(key, id);

		return super.set(key, value);
	}

	public override delete(key: K) {
		if (this.timers.has(key)) {
			clearTimeout(this.timers.get(key));
			this.timers.delete(key);
		}
		return super.delete(key);
	}

	public override clear(): void {
		for (const timeoutId of this.timers.values()) {
			clearTimeout(timeoutId);
		}
		this.timers.clear();
		return super.clear();
	}
}
