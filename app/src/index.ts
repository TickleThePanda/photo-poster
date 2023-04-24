import { login } from "masto";
import aws from "aws-sdk";

const secretsManagerClient = new aws.SecretsManager();

type Gallery = {
  name: string;
  ref: string;
  description: string;
  images: Image[];
};

type Image = {
  name: string;
  alt: string;
  originalImageUrl: string;
  sizes: Size[];
  aspectRatio: {
    x: string;
    y: string;
  };
};

type Size = {
  x: number;
  y: number;
  type: string;
  url: string;
};

export async function handler() {
  const mastodonApiToken = await getSecret("MASTODON_API_TOKEN");
  const mastodonApiBaseUrl = process.env.MASTODON_API_BASE_URL;
  const galleryUrl = process.env.GALLERY_URL;

  if (mastodonApiBaseUrl === undefined) {
    throw new Error("Env MASTODON_API_BASE_URL must be defined");
  }
  if (galleryUrl === undefined) {
    throw new Error("Env GALLERY_URL must be defined");
  }

  console.log(`Using gallery URL: '${galleryUrl}'`);
  console.log(`Mastodon API base URL '${mastodonApiBaseUrl}'`);

  const result = await fetch(galleryUrl);

  /**
   * @type {Gallery[]}
   */
  const galleries = (await result.json()).galleries;
  const selectedImage = selectRandomImage(galleries);
  console.log(`Selected random image '${selectedImage.name}'`);
  const largestSize = getLargestSizeImage(selectedImage);
  console.log(`Selected size ${largestSize.x}x${largestSize.y}`);
  const url = galleryUrl + largestSize.url;

  const blob = await getFileAsBlob(url);

  const masto = await login({
    url: mastodonApiBaseUrl,
    accessToken: mastodonApiToken,
  });

  const attachment = await masto.v2.mediaAttachments.create({
    file: blob,
    description: selectedImage.alt,
  });

  await masto.v1.statuses.create({
    status: `"${selectedImage.name}"
#FilmPhotography
More: https://www.ticklethepanda.dev/photography/`,
    mediaIds: [attachment.id],
    visibility: "public",
  });
}

function getLargestSizeImage(selectedImage: Image): Size {
  const smallestSize: Size = <Size>{
    x: 0,
    y: 0,
  };
  const imageSizes = selectedImage.sizes.filter((s) => (s.type = "webp"));
  const largestSize = imageSizes.reduce(
    (p, c) => (c.x > p.x ? c : p),
    smallestSize
  );
  return largestSize;
}

function selectRandomImage(galleries: Gallery[]): Image {
  const allImages = galleries.flatMap((g) => g.images);
  const imageCount = allImages.length;
  const randomIndex = Math.floor(Math.random() * imageCount);
  const selectedImage = allImages[randomIndex];
  return selectedImage;
}

async function getSecret(secretName: string) {
  const secretKey = process.env[`${secretName}_ASM_NAME`];

  if (secretKey === undefined) {
    throw new Error(`Env ${secretName}_ASM_NAME must be defined`);
  }

  const { SecretString: value } = await secretsManagerClient
    .getSecretValue({
      SecretId: secretKey,
    })
    .promise();

  if (value === null || value === undefined) {
    throw new Error(`No such secret ${secretName}`);
  }

  return value;
}

async function getFileAsBlob(url: string): Promise<Blob> {
  console.log(`Downloading image ${url}`);
  const response = await fetch(url);

  console.log(`Response from server ${response.status} ${response.statusText}`);

  return await response.blob();
}
