/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { BatchExecuteClient } from "./batchexecute.ts";
import { decodeBatchExecuteResponse } from "./batchexecute/decoder.ts";
import { PreparedBatchExecute } from "./batchexecute/encoder.ts";
import { BatchExecuteError } from "./batchexecute/types.ts";

const encoder = new TextEncoder();

function compressedEnvelope(rpcId: string, data: unknown, index = "generic"): string {
	const envelope = JSON.stringify([[
		"wrb.fr",
		rpcId,
		JSON.stringify(data) + "\n",
		null,
		null,
		null,
		index,
	]]);
	return `${encoder.encode(envelope).byteLength}\n${envelope}`;
}

Deno.test("PreparedBatchExecute creates a single-RPC request", () => {
	const request = new PreparedBatchExecute({
		host: "example.test",
		app: "ExampleApp",
		requestId: 1234,
		responseMode: "c",
		params: { hl: "en", enabled: true },
		rpcs: [{ id: "rpc", args: ["text", { count: 1 }] }],
	});

	assertEquals(
		request.url.toString(),
		"https://example.test/_/ExampleApp/data/batchexecute?rpcids=rpc&_reqid=1234&rt=c&hl=en&enabled=true",
	);
	assertEquals(
		request.body.get("f.req"),
		'[[["rpc","[\\"text\\",{\\"count\\":1}]",null,"generic"]]]',
	);
});

Deno.test("decodeBatchExecuteResponse decodes byte-framed compressed envelopes", () => {
	const raw = `)]}'\n\n${compressedEnvelope("one", ["olá"])}${
		compressedEnvelope("two", ["世界"], "2")
	}`;
	assertEquals(decodeBatchExecuteResponse(raw, "c", ["one", "two"]), [
		{ index: 1, rpcId: "one", data: ["olá"] },
		{ index: 2, rpcId: "two", data: ["世界"] },
	]);
});

Deno.test("decodeBatchExecuteResponse rejects an unexpected RPC response", () => {
	const raw = `)]}'\n\n${compressedEnvelope("other", [])}`;
	assertThrows(() => decodeBatchExecuteResponse(raw, "c", ["expected"]), BatchExecuteError);
});

Deno.test("BatchExecuteClient bootstraps a WIZ session, caches it, and sends generic RPCs", async () => {
	const calls: { url: string; init?: RequestInit }[] = [];
	const response = `)]}'\n\n${compressedEnvelope("rpc", ["result"])} `;
	const client = new BatchExecuteClient({
		origin: "https://example.test",
		app: "ExampleApp",
		locale: "pt-BR",
		fetch: (input, init) => {
			calls.push({ url: String(input), init });
			if (calls.length === 1) {
				return Promise.resolve(
					new Response(
						'<script>WIZ_global_data = {"FdrFJe":"sid","cfb2h":"build","SNlM0e":"token"};</script>',
					),
				);
			}
			return Promise.resolve(new Response(response));
		},
	});

	assertEquals(await client.execute([{ id: "rpc", args: ["input"] }], { requestId: 1234 }), [
		{ index: 1, rpcId: "rpc", data: ["result"] },
	]);
	assertEquals(calls.length, 2);
	assertEquals(
		calls[1].url,
		"https://example.test/_/ExampleApp/data/batchexecute?rpcids=rpc&_reqid=1234&rt=c&f.sid=sid&bl=build&hl=pt-BR&soc-app=1&soc-platform=1&soc-device=1",
	);
	assertEquals(await (calls[1].init?.body as URLSearchParams).get("at"), "token");
	assertEquals((await client.getSession()).fSid, "sid");
	assertEquals(calls.length, 2);
});

function assertEquals(actual: unknown, expected: unknown): void {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(`expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
	}
}

function assertThrows(fn: () => void, type: new (...args: never[]) => Error): void {
	try {
		fn();
	} catch (error) {
		if (error instanceof type) return;
		throw error;
	}
	throw new Error("expected function to throw");
}
