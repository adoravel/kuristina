import { MessageComponentTypes, type ThumbnailComponent } from "@discordeno/types";

export type ThumbnailProps = Omit<ThumbnailComponent, "type" | "media"> & { url: string };

export function Thumbnail({ url, ...props }: ThumbnailProps): ThumbnailComponent {
	return {
		type: MessageComponentTypes.Thumbnail,
		media: { url },
		...props,
	};
}
