/**
 * kuristina, a bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { intrinsicTags, md } from "./design/markdown.ts";
import {
	ActionRow,
	type ActionRowProps,
	Button,
	type ButtonProps,
	ComponentMessage,
	type ComponentMessageProps,
	Container,
	type ContainerProps,
	type EntitySelectProps,
	MediaGallery,
	MediaGalleryItem,
	type MediaGalleryItemProps,
	type RegisteredIconName,
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
	Thumbnail,
	type ThumbnailProps,
} from "@kuristina/discord-ui";
import { childrenToArray, childrenToString, transformChildrenArray } from "./utils.ts";
import { tryIconMarkdown } from "./icons/manifest.ts";
import { MessageComponentTypes, type SelectMenuDefaultValue } from "@discordeno/types";
import type { MediaItemProps } from "./components/MediaItem.tsx";
import type { MediaGalleryProps } from "./components/MediaGallery.tsx";
import {
	ChannelSelect,
	EntityDefault,
	type EntityDefaultProps,
	EntitySelect,
	type EntitySelectType,
	MentionableSelect,
	RoleSelect,
	UserSelect,
} from "./components/EntitySelect.tsx";

export const Fragment = Symbol("JSX.Fragment");

type Props = Record<string, unknown> & { children?: unknown; root?: boolean };
type FunctionComponent = (props: Props) => unknown;
type ElementType = keyof JSX.IntrinsicElements | typeof Fragment | FunctionComponent;

function renderList(tag: "ul" | "ol", props: Props): string {
	const raw = props.children;
	if (!raw) return "";

	const children = Array.isArray(raw) ? raw : [raw];
	const items = transformChildrenArray(children).map(String);

	return tag === "ul" ? md.list(items, "-") : md.orderedList(items);
}

export function div({ children, ...props }: ContainerProps) {
	const components = childrenToArray(children).map((child) => toComponent(child));

	return Container({
		...props,
		children: components,
	});
}

function toComponent(child: any): any {
	if (child == null) return null;
	if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
		return TextDisplay({ children: String(child) });
	}
	if (Array.isArray(child)) {
		return child.map(toComponent).filter(Boolean);
	}
	return child;
}

export function renderSection(props: Props): unknown {
	const children = childrenToArray(props?.children)
		.map(toComponent)
		.flat()
		.filter(Boolean);

	const embeddedAccessory = children.find((child) => {
		if (!child || typeof child !== "object" || !("type" in child)) return false;
		return child.type === MessageComponentTypes.Thumbnail ||
			child.type === MessageComponentTypes.Button;
	});

	const textComponents = children.filter((child) => {
		if (!child || typeof child !== "object" || !("type" in child)) {
			return false;
		}
		return child !== embeddedAccessory;
	});

	let text = textComponents;
	if (textComponents.length > 3) {
		const allowedComponents = textComponents.slice(0, 2);
		const overflowComponents = textComponents.slice(2);

		const mergedContent = overflowComponents
			.map((comp) => comp.content || "")
			.filter(Boolean)
			.join("\n");

		const consolidatedComponent = TextDisplay({ children: mergedContent });
		text = [...allowedComponents, consolidatedComponent];
	}

	return Section({
		...props,
		children: text,
		accessory: embeddedAccessory ?? props?.accessory,
	});
}

export function renderAccessory(props: Props): unknown {
	const children = childrenToArray(props?.children);
	return children[0] ?? "";
}

export function renderMessage(props: Props): unknown {
	const { root, ...p } = props;
	p.allowedMentions ??= { parse: [], repliedUser: false };

	if (!root) {
		return ComponentMessage({
			...(p as ComponentMessageProps),
			children: [div({ children: p.children as any })],
		});
	}

	const rawChildren = childrenToArray(p.children).flat().filter(Boolean);

	const components = rawChildren
		.map((child) => {
			if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
				return div({
					children: [TextDisplay({ children: String(child) })],
				});
			}

			if (typeof child === "object" && "type" in child) {
				if (child.type === MessageComponentTypes.TextDisplay) {
					return div({ children: [child] });
				}
				if (child.type === MessageComponentTypes.Separator) {
					return null;
				}
			}

			return child;
		})
		.filter(Boolean);

	return ComponentMessage({
		...p,
		children: components,
	} as any);
}

function renderEntitySelect<T extends EntitySelectType>(
	props: Props & { selectType: EntitySelectProps<T>["selectType"] },
) {
	const { selectType, children, ...rest } = props;
	const defaultValues = childrenToArray(children)
		.filter(Boolean)
		.map((child) => {
			if (typeof child === "object" && child !== null && "id" in child && "type" in child) {
				return child;
			}
			return null;
		})
		.filter(Boolean);

	return EntitySelect<T>({
		selectType,
		...rest as any,
		children: defaultValues.length ? defaultValues : undefined,
	});
}

function renderEntityDefault(props: Props): SelectMenuDefaultValue {
	const { id, type } = props;
	return EntityDefault({ id: String(id), type: String(type) as any });
}

function renderMediaGallery(props: Props): unknown {
	const { children, ...rest } = props;

	const items = childrenToArray(children)
		.map((child) => toComponent(child))
		.filter(Boolean);

	return MediaGallery({
		...rest,
		children: items,
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
			case "hr":
				return Separator(props as SeparatorProps);
			case "row":
				return ActionRow(props as ActionRowProps);
			case "select":
				return StringSelect(props as StringSelectProps);
			case "option":
				return StringOption(props as unknown as StringOptionProps);
			case "message":
				return renderMessage(props);
			case "li":
				return childrenToString("li", props.children) ?? "";
			case "ul":
			case "ol":
				return renderList(type, props);
			case "accessory":
				return renderAccessory(props);
			case "section":
				return renderSection(props);
			case "thumbnail":
				return Thumbnail(props as ThumbnailProps);
			case "button":
				return Button(props as ButtonProps);
			case "icon":
				return tryIconMarkdown((props as JSX.IntrinsicElements["icon"]).name) ?? "";
			case "entity-select":
				return renderEntitySelect(props as any);
			case "entity-default":
				return renderEntityDefault(props);
			case "user-select":
				return UserSelect(props as Omit<EntitySelectProps<"user">, "selectType">);
			case "role-select":
				return RoleSelect(props as Omit<EntitySelectProps<"role">, "selectType">);
			case "channel-select":
				return ChannelSelect(props as Omit<EntitySelectProps<"channel">, "selectType">);
			case "mentionable-select":
				return MentionableSelect(props as Omit<EntitySelectProps<"mentionable">, "selectType">);
			case "media-item":
				return MediaGalleryItem(props as unknown as MediaGalleryItemProps);
			case "gallery":
				return renderMediaGallery(props);
			case "gallery-item":
				return MediaGalleryItem(props as unknown as MediaGalleryItemProps);

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
		message: ComponentMessageProps & { root?: boolean };
		div: ContainerProps;
		p: TextDisplayProps;
		span: TextDisplayProps;
		hr: SeparatorProps;
		row: ActionRowProps;
		select: StringSelectProps;
		"option": StringOptionProps;
		icon: { name: RegisteredIconName };

		section: Omit<SectionProps, "accessory">;
		accessory: { children?: unknown };
		thumbnail: ThumbnailProps;
		button: ButtonProps;

		"entity-select": EntitySelectProps<EntitySelectProps<any>["selectType"]>;
		"entity-default": EntityDefaultProps;
		"user-select": Omit<EntitySelectProps<"user">, "selectType">;
		"role-select": Omit<EntitySelectProps<"role">, "selectType">;
		"channel-select": Omit<EntitySelectProps<"channel">, "selectType">;
		"mentionable-select": Omit<EntitySelectProps<"mentionable">, "selectType">;

		gallery: MediaGalleryProps;
		"media-item": MediaItemProps;
		"gallery-item": MediaGalleryItemProps;

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
