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
    return image.meta !== undefined && image.meta !== null;
  }

  async post(image: SelectedImage): Promise<void> {
    const api = await this.login();

    const imageUrl = await api.uploadImage(image);

    const body = {
      kind: "image",
      url: imageUrl,
      sr: "analog",
      title: `${image.name} (${image.meta})`,
    };

    const postResult = await api.post("/api/submit", body);

    console.log("Result from reddit: " + JSON.stringify(postResult));
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

  async uploadImage(image: SelectedImage) {
    const mediaBody = new FormData();
    mediaBody.append("filepath", "photo");
    mediaBody.append("mimetype", "image/webp");

    const mediaResult = (await this.post("/api/media/asset.json", {
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

    const imageUrl = `${uploadUrl}/${uploadData.key}`;
    return imageUrl;
  }

  async post(
    path: string,
    data: object,
    { json }: { json: boolean } = { json: false }
  ) {
    const response = await fetch(apiBase + path, {
      ...this.defaultRequest(
        json
          ? {
              "Content-Type": "application/json",
            }
          : {}
      ),
      method: "POST",
      body: json
        ? JSON.stringify(data)
        : convertJsonToFormEncoding({
            ...data,
            api_type: "json",
          }),
    });

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

  private defaultRequest(headers?: object) {
    return {
      headers: {
        Authorization: `bearer ${this.token}`,
        "User-Agent": "PhotoPoster by TickleThePanda",
        ...headers,
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
