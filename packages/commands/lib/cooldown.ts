export class CooldownTracker {
	private readonly timestamps = new Map<string, number>();

	private key(userId: bigint, commandName: string): string {
		return `${userId}:${commandName}`;
	}

	check(userId: bigint, commandName: string, cooldownMs: number): boolean {
		const last = this.timestamps.get(this.key(userId, commandName));
		return !last || Date.now() - last >= cooldownMs;
	}

	set(userId: bigint, commandName: string, cooldownMs: number): void {
		const key = this.key(userId, commandName);
		this.timestamps.set(key, Date.now());
		setTimeout(() => this.timestamps.delete(key), cooldownMs);
	}
}
