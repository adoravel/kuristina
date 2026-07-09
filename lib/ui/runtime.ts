/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

export const Fragment = Symbol("ComponentsJsx.Fragment");

type FunctionComponent = (props: any) => any;

export function jsx(
	type: "br" | typeof Fragment | FunctionComponent,
	props: any,
) {
	switch (type) {
		case "br":
			return "\n";
		case Fragment:
			return props?.children ?? {};
	}
	props ??= {};
	return type(props);
}

export { jsx as jsxs };
