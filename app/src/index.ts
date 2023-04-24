import { ImageSelector } from "./image-selector";
import { MastodonPostLocation } from "./post-locations/mastodon-location";
import { PostLocation } from "./post-locations/post-location";
import { getRequiredEnv } from "./required-env";
import { getSecret } from "./secrets-manager";

export async function handler() {
  const mastodonApiToken = await getSecret("MASTODON_API_TOKEN");
  const mastodonApiBaseUrl = getRequiredEnv("MASTODON_API_BASE_URL");
  const galleryUrl = getRequiredEnv("GALLERY_URL");

  console.log(`Using gallery URL: '${galleryUrl}'`);
  console.log(`Mastodon API base URL '${mastodonApiBaseUrl}'`);

  const imageSelector = new ImageSelector(galleryUrl);
  const postLocations: PostLocation[] = [
    new MastodonPostLocation({
      baseUrl: mastodonApiBaseUrl,
      accessToken: mastodonApiToken,
    }),
  ];

  const image = await imageSelector.selectRandomImage();

  Promise.allSettled(postLocations.map((l) => l.post(image)));
}
