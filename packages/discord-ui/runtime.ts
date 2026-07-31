/**
 * kuristina, a bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { intrinsicTags, md } from "./design/markdown.ts";
import {
	ActionRow,
	type ActionRowProps,
	ComponentMessage,
	type ComponentMessageProps,
	Container,
	type ContainerProps,
	Section,
	type SectionProps,
	Separator,
	type SeparatorProps,
	StringOption,
	type StringOptionProps,
	StringSelect,
	type StringSelectProps,
	TextDisplay,
	type TextDisplayProps,
} from "@kuristina/discord-ui";
import { childrenToArray, childrenToString, transformChildrenArray } from "./utils.ts";

export const Fragment = Symbol("JSX.Fragment");

type Props = Record<string, unknown> & { children?: unknown; raw?: boolean };
type FunctionComponent = (props: Props) => unknown;
type ElementType = string | typeof Fragment | FunctionComponent;

function renderList(tag: "ul" | "ol", props: Props): string {
	const raw = props.children;
	if (!raw) return "";

	const children = Array.isArray(raw) ? raw : [raw];
	const items = transformChildrenArray(children).map(String);

	return tag === "ul" ? md.list(items, "-") : md.orderedList(items);
}

export function div({ children, ...props }: ContainerProps) {
	const components = childrenToArray(children).map((child) =>
		typeof child === "string" ? TextDisplay({ children: child }) : child
	);

	return Container({
		...props,
		children: components,
	});
}

export function jsx(type: ElementType, props?: Props | null) {
	if (type === Fragment) return props?.children ?? [];
	props ??= {};

	if (typeof type === "string") {
		switch (type) {
			case "br":
				return "\n";
			case "p":
			case "span":
				return TextDisplay(props as TextDisplayProps);
			case "div":
				return div(props as ContainerProps);
			case "section":
				return Section(props as SectionProps);
			case "hr":
				return Separator(props as SeparatorProps);
			case "row":
				return ActionRow(props as ActionRowProps);
			case "select":
				return StringSelect(props as StringSelectProps);
			case "option":
				return StringOption(props as unknown as StringOptionProps);
			case "message":
				return props.raw ? ComponentMessage(props as ComponentMessageProps) : ComponentMessage({
					...(props as ComponentMessageProps),
					children: [div({ children: props.children as any })],
				});
			case "li":
				return childrenToString("li", props.children) ?? "";
			case "ul":
			case "ol":
				return renderList(type, props);
			default: {
				const render = intrinsicTags[type];
				if (!render) {
					throw new Error(
						`<${type}> is not a recognised intrinsic element. Available: br, li, ul, ol, div, p, span, section, hr, row, select, option, message, ${
							Object.keys(
								intrinsicTags,
							).join(", ")
						}`,
					);
				}
				return render(childrenToString(type, props.children) ?? "", props);
			}
		}
	}

	return type(props);
}

export declare namespace JSX {
	interface ElementChildrenAttribute {
		children: Record<PropertyKey, never>;
	}

	interface IntrinsicElements {
		message: ComponentMessageProps & { raw?: boolean };
		div: ContainerProps;
		p: TextDisplayProps;
		span: TextDisplayProps;
		section: SectionProps;
		hr: SeparatorProps;
		row: ActionRowProps;
		select: StringSelectProps;
		option: StringOptionProps;

		br: Record<string, never>;
		strong: { children?: unknown };
		sub: { children?: unknown };
		b: { children?: unknown };
		em: { children?: unknown };
		i: { children?: unknown };
		code: { children?: unknown };
		kbd: { children?: unknown };
		pre: { children?: unknown; lang?: string };
		blockquote: { children?: unknown };
		q: { children?: unknown };
		h1: { children?: unknown };
		h2: { children?: unknown };
		h3: { children?: unknown };
		a: { children?: unknown; href: string };
		ul: { children?: unknown };
		ol: { children?: unknown };
		li: { children?: unknown };
		del: { children?: unknown };
		s: { children?: unknown };
		u: { children?: unknown };
		spoiler: { children?: unknown };
	}
}

export { jsx as jsxs };
