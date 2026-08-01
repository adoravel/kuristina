import { type ButtonComponent, MessageComponentTypes } from "@discordeno/types";
import { childrenToString } from "../utils.ts";

type Button = Omit<ButtonComponent, "type" | "label">;

export type ButtonProps = Button & { children?: any };

export function Button({ children, ...props }: ButtonProps): ButtonComponent {
	return {
		type: MessageComponentTypes.Button,
		label: childrenToString("Button", children) ?? undefined,
		...props,
	};
}
