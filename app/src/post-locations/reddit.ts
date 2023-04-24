import type { SelectedImage } from "../image-selector";
import { PostLocation } from "./post-location.js";

import totp from "totp-generator";

const authUrl = "https://www.reddit.com/api/v1/access_token/";
const apiBase = "https://oauth.reddit.com/api";

export type RedditConfig = {
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
    const accessToken = await this.login();

    const body = {
      kind: "image",
      title: `${image.name} (${image.meta})`,
      url: image.fullUrl,
      sr: "test",
    };

    const result = await fetch(apiBase + "/submit/", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        Authorization: "bearer " + accessToken,
        "User-Agent": "PhotoPoster by TickleThePanda",
      },
    });

    if (result.status !== 200) {
      throw new Error(
        `Error posting image ${result.status} ${result.statusText}`
      );
    }

    console.log("Result from reddit: " + JSON.stringify(await result.json()));
  }

  private async login() {
    const totpKey = totp(this.config.posterTotpKey);

    const body = new FormData();
    body.append("grant_type", "password");
    body.append("username", this.config.posterUser);
    body.append("password", this.config.posterPassword + ":" + totpKey);

    const authHeaderValue =
      "Basic " +
      Buffer.from(
        this.config.clientKey + ":" + this.config.clientSecret
      ).toString("base64");

    const result = await fetch(authUrl, {
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

    if (data.access_token === undefined) {
      throw new Error(`Error logging into reddit ${JSON.stringify(data)}`);
    }

    const accessToken = data.access_token;
    return accessToken;
  }
}
