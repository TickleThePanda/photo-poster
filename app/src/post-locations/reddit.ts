import type { SelectedImage } from "../image-selector";
import { PostLocation } from "./post-location.js";
import { fetch, FormData } from "undici";

import totp from "totp-generator";

const authUrl = "https://www.reddit.com/api/v1/access_token/";
const apiBase = "https://oauth.reddit.com";

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
    const api = await this.login();

    const mediaBody = new FormData();
    mediaBody.append("filepath", "photo");
    mediaBody.append("mimetype", "image/webp");

    const mediaResult = (await api.post("/api/media/asset.json", {
      filepath: "photo",
      mimetype: "image/webp",
    })) as any;

    console.log("Result from media" + JSON.stringify(mediaResult));

    const uploadLease = mediaResult.args;
    const uploadUrl = "https:" + uploadLease.action;
    const uploadData = uploadLease.fields.reduce((p: any, c: any) => {
      p[c.name] = c.value;
      return p;
    }, {});

    const uploadFormData = convertJsonToFormEncoding(uploadData);
    uploadFormData.append("file", image.blob, "photo");

    const result = await fetch(uploadUrl, {
      method: "POST",
      body: uploadFormData,
    });

    console.log(
      `Result from file upload ${result.status} ${result.statusText}`
    );
    console.log(`Content from file upload ${await result.text()}`);

    // const result = await api.post("/api/submit/", {
    //   kind: "image",
    //   title: `${image.name} (${image.meta})`,
    //   url: image.fullUrl,
    //   sr: "test",
    // });

    // console.log("Result from reddit: " + JSON.stringify(result));
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

    const data = (await result.json()) as any;

    if (data.access_token === undefined) {
      throw new Error(`Error logging into reddit ${JSON.stringify(data)}`);
    }

    const accessToken = data.access_token;
    return new RedditUserApi(accessToken);
  }
}

class RedditUserApi {
  constructor(private token: string) {}
  async post(path: string, data: Record<string, string>) {
    const response = await fetch(
      apiBase + path,
      Object.assign(this.defaultRequest(), {
        method: "POST",
        body: convertJsonToFormEncoding({
          ...data,
          api_type: "json",
        }),
      })
    );

    if (response.status !== 200) {
      console.log(
        `Error making request ${path}: ${response.status} ${response.statusText}`
      );
      throw new Error(
        `Error making request ${path}: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  private defaultRequest() {
    return {
      headers: {
        Authorization: `bearer ${this.token}`,
        "User-Agent": "PhotoPoster by TickleThePanda",
      },
    };
  }
}

function convertJsonToFormEncoding(data: Record<string, string>): FormData {
  const body = new FormData();
  for (const [k, v] of Object.entries(data)) {
    body.append(k, v);
  }
  return body;
}
