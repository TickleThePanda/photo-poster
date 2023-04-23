import axios from "axios";
import { login } from "masto";
import aws from "aws-sdk";
import { createWriteStream } from "fs";

const fileLocation = "/tmp/image";
const secretsManagerClient = new aws.SecretsManager();

/**
 * @typedef {Object} Gallery
 * @property {string} name
 * @property {string} ref
 * @property {string} description
 * @property {Image[]} images
 */

/**
 * @typedef {Object} Image
 * @property {string} name
 * @property {string} alt
 * @property {string} originalImageUrl
 * @property {Size[]} sizes
 * @property {AspectRatio} aspectRatio
 */

/**
 * @typedef {Object} Size
 * @property {number} x
 * @property {number} y
 * @property {string} type
 * @property {string} url
 */

/**
 * @typedef {Object} AspectRatio
 * @property {string} x
 * @property {string} y
 */

export async function handler() {
  const mastodonApiToken = await getSecret("MASTODON_API_TOKEN");
  const mastodonApiBaseUrl = process.env.MASTODON_API_BASE_URL;
  const galleryUrl = process.env.GALLERY_URL;

  console.log("Using gallery URL: " + galleryUrl);
  console.log("Mastodon API base URL: " + mastodonApiBaseUrl);

  const result = await axios.get(galleryUrl, {});

  /**
   * @type {Gallery[]}
   */
  const galleries = result.data.galleries;

  const selectedImage = selectRandomImage(galleries);
  console.log(`Selected random image ${selectedImage.name}`);
  const largestSize = getLargestSizeImage(selectedImage);
  console.log(`Selected size ${largestSize.x}x${largestSize.y}`);
  const url = galleryUrl + largestSize.url;

  await downloadFile(url, fileLocation);

  const masto = await login({
    url: mastodonApiBaseUrl,
    accessToken: mastodonApiToken,
  });

  const attachment = await masto.v1.mediaAttachments.create({
    file: fileLocation,
    description: selectedImage.alt,
  });

  const status = await masto.v1.statuses.create({
    status: `${selectedImage.name} #photography`,
    mediaIds: [attachment.id],
    visibility: "public",
  });
}

/**
 *
 * @param {Image} selectedImage
 * @returns {Size}
 */
function getLargestSizeImage(selectedImage) {
  const imageSizes = selectedImage.sizes.filter((s) => (s.type = "webp"));
  const largestSize = imageSizes.reduce((p, c) => (c.x > p.x ? c : p), {
    x: 0,
  });
  return largestSize;
}

/**
 * @param {Gallery[]} galleries
 * @returns {Image}
 */
function selectRandomImage(galleries) {
  const allImages = galleries.flatMap((g) => g.images);
  const imageCount = allImages.length;
  const randomIndex = Math.floor(Math.random() * imageCount);
  const selectedImage = allImages[randomIndex];
  return selectedImage;
}

async function getSecret(secretName) {
  const { SecretString: value } = await secretsManagerClient
    .getSecretValue({
      SecretId: process.env[`${secretName}_ASM_NAME`],
    })
    .promise();

  if (value === null || value === undefined) {
    throw new Error(`No such secret ${secretName}`);
  }

  return value;
}

async function downloadFile(url, file) {
  console.log(`Downloading image to temporary file: ${url}`);
  const response = await axios.get(url, {
    responseType: "stream",
  });
  const writer = createWriteStream(file);

  console.log(`Response from server ${response.status} ${response.statusText}`);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("error", (err) => {
      writer.close();
      reject(err);
    });
    writer.on("close", () => {
      resolve(true);
    });
  });
}
