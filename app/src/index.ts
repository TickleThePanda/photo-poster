import { Handler, Context } from "aws-lambda";
import { ImageSelector } from "./image-selector.js";
import { PostLocation } from "./post-locations/post-location.js";
import { MastodonPostLocation } from "./post-locations/mastodon.js";
import { getRequiredEnv } from "./required-env.js";
import { getSecret } from "./secrets-manager.js";
import { RedditPostLocation } from "./post-locations/reddit.js";

type Event = {
  excludes: string[] | undefined;
};

export const handler: Handler = async (
  event: Event | undefined,
  context: Context
) => {
  const mastodonApiToken = await getSecret("MASTODON_API_TOKEN");
  const mastodonApiBaseUrl = getRequiredEnv("MASTODON_API_BASE_URL");
  const galleryUrl = getRequiredEnv("GALLERY_URL");

  console.log(`Using gallery URL: '${galleryUrl}'`);
  console.log(`Mastodon API base URL '${mastodonApiBaseUrl}'`);

  const imageSelector = new ImageSelector(galleryUrl);
  const postLocations: Record<string, PostLocation> = {
    mastodon: new MastodonPostLocation({
      baseUrl: mastodonApiBaseUrl,
      accessToken: mastodonApiToken,
    }),
    reddit: new RedditPostLocation({
      baseUrl: "https://www.reddit.com/api/v1/",
      clientKey: await getSecret("REDDIT_API_APP_ID"),
      clientSecret: await getSecret("REDDIT_API_APP_SECRET"),
      posterUser: await getSecret("REDDIT_API_POSTER_USER"),
      posterPassword: await getSecret("REDDIT_API_POSTER_PASSWORD"),
      posterTotpKey: await getSecret("REDDIT_API_POSTER_OTP_KEY"),
    }),
  };

  const image = await imageSelector.selectRandomImage();

  const activePostLocations: PostLocation[] = getActiveLocations(
    event,
    postLocations
  );

  await Promise.allSettled(activePostLocations.map((l) => l.post(image)));

  return context.logStreamName;
};

function getActiveLocations(
  event: Event | undefined,
  postLocations: Record<string, PostLocation>
): PostLocation[] {
  const excludes = event?.excludes;
  if (Array.isArray(excludes)) {
    const keys = Object.keys(postLocations);
    console.log(`Filtering locations ${keys} to exclude "${excludes}"`);

    return Object.entries(postLocations)
      .filter(([key]) => !excludes.includes(key))
      .map(([_, v]) => v);
  } else {
    console.log("Use all locations");
    return Object.values(postLocations);
  }
}
