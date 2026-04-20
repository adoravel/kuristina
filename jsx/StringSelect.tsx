import { MessageComponentTypes, SelectOption, StringSelectComponent } from "@discordeno/types";
import { childrenToArray } from "./utils.ts";
import { Flatten } from "~/util/types.ts";

export type StringSelectProps = Omit<StringSelectComponent, "type" | "options"> & {
	children: Flatten<StringSelectComponent["options"]> | StringSelectComponent["options"];
};

export function StringSelect(
	{ children, ...props }: StringSelectProps,
): StringSelectComponent {
	return {
		type: MessageComponentTypes.StringSelect,
		options: childrenToArray(children),
		...props,
	};
}

export function StringOption(props: SelectOption) {
	return props;
}
