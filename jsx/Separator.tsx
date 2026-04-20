import { MessageComponentTypes, SeparatorComponent } from "@discordeno/bot";

export type SeparatorProps = Omit<SeparatorComponent, "type">;

export function Separator(props: SeparatorProps): SeparatorComponent {
	return {
		type: MessageComponentTypes.Separator,
		...props,
	};
}
