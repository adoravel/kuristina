import {
	type ButtonComponent,
	MessageComponentTypes,
	type SectionComponent,
	type TextDisplayComponent,
	type ThumbnailComponent,
} from "@discordeno/types";
import { childrenToArray } from "../utils.ts";

export interface SectionProps {
	children: TextDisplayComponent[];
	accessory: ThumbnailComponent | ButtonComponent;
}

export function Section({ children, ...props }: SectionProps): SectionComponent {
	return {
		type: MessageComponentTypes.Section,
		components: childrenToArray(children),
		...props,
	};
}
