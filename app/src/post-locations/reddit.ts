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
  public readonly type = "reddit";
  constructor(private config: RedditConfig) {}

  async canPost(image: SelectedImage): Promise<boolean> {
    return image.meta !== undefined;
  }

  async post(image: SelectedImage): Promise<void> {
    const totpKey = totp.gen(this.config.posterTotpKey);

    console.log(totpKey);

    const body = new FormData();
    body.append("grant_type", "password");
    body.append("username", this.config.posterUser);
    body.append("password", this.config.posterPassword + ":" + totpKey);

    const authHeaderValue =
      "Basic " +
      Buffer.from(
        this.config.clientKey + ":" + this.config.clientSecret
      ).toString("base64");

    const result = await fetch(this.config.baseUrl + "/access_token/", {
      method: "POST",
      body,
      headers: {
        Authorization: authHeaderValue,
      },
    });

    if (result.status !== 200) {
      throw new Error(
        `Error logging into reddit ${result.status} ${result.statusText}`
      );
    }

    const data = await result.json();

    console.log("Result from reddit " + JSON.stringify(data, null, 2));
  }
}
