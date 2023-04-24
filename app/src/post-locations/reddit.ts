import type { SelectedImage } from "../image-selector";
import { PostLocation } from "./post-location.js";

import { totp } from "notp";

export type RedditConfig = {
  baseUrl: string;
  clientKey: string;
  clientSecret: string;
  posterUser: string;
  posterPassword: string;
  posterTotpKey: string;
};

export class RedditPostLocation implements PostLocation {
  constructor(private config: RedditConfig) {}

  async canPost(image: SelectedImage): Promise<boolean> {
    return image.meta !== undefined;
  }

  async post(image: SelectedImage): Promise<void> {
    const formData = {
      grant_type: "password",
      username: this.config.posterUser,
      password:
        this.config.posterPassword + ":" + totp.gen(this.config.posterTotpKey),
    };

    const formDataBody = Object.entries(formData)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    const authHeaderValue =
      "Basic " +
      Buffer.from(
        this.config.clientKey + ":" + this.config.clientSecret
      ).toString("base64");

    const data = await (
      await fetch(this.config.baseUrl + "/v1/access_token/", {
        method: "POST",
        body: formDataBody,
        headers: {
          Authorization: authHeaderValue,
        },
      })
    ).json();

    console.log(data);
  }
}
