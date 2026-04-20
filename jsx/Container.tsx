import { ContainerComponent, MessageComponentTypes } from "@discordeno/types";
import { childrenToArray } from "./utils.ts";

export type ContainerProps = Omit<ContainerComponent, "type" | "components"> & {
	children: ContainerComponent["components"];
};

export function Container({ children, ...props }: ContainerProps): ContainerComponent {
	return {
		type: MessageComponentTypes.Container,
		components: childrenToArray(children),
		...props,
	};
}
