import { login } from "masto";
import { SelectedImage } from "../image-selector";
import { PostLocation } from "./post-location";

export type MastodonConfig = {
  baseUrl: string;
  accessToken: string;
};

export class MastodonPostLocation implements PostLocation {
  constructor(private config: MastodonConfig) {}

  async post(image: SelectedImage): Promise<void> {
    const masto = await login({
      url: this.config.baseUrl,
      accessToken: this.config.accessToken,
    });

    const attachment = await masto.v2.mediaAttachments.create({
      file: image.blob,
      description: image.alt,
    });

    await masto.v1.statuses.create({
      status: `"${image.name}"
  #FilmPhotography #Photography
  More: https://www.ticklethepanda.dev/photography/`,
      mediaIds: [attachment.id],
      visibility: "public",
    });
  }
}
