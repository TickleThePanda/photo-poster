import { login } from "masto";
import type { SelectedImage } from "../image-selector";
import { PostLocation } from "./post-location.js";

export type MastodonConfig = {
  baseUrl: string;
  accessToken: string;
};

export class MastodonPostLocation implements PostLocation {
  public readonly type = "mastodon";
  constructor(private config: MastodonConfig) {}

  async canPost(image: SelectedImage): Promise<boolean> {
    return true;
  }

  async post(image: SelectedImage): Promise<void> {
    const masto = await login({
      url: this.config.baseUrl,
      accessToken: this.config.accessToken,
    });

    const attachment = await masto.v2.mediaAttachments.create({
      file: image.blob,
      description: image.alt,
    });

    const meta = (image.meta !== undefined && image.meta !== null) ? `(${image.meta})` : "";

    await masto.v1.statuses.create({
      status: `"${image.name}" ${meta}
  #FilmPhotography #Photography
  More: https://www.ticklethepanda.dev/photography/`,
      mediaIds: [attachment.id],
      visibility: "public",
    });
  }
}
