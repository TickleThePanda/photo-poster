import axios, { Axios } from "axios";
import { login } from "masto";
import aws from "aws-sdk";

const axois = new Axios();

const fileLocation = "/tmp/image";

export async function handler() {
  const mastodonApiToken = await getSecret("MASTODON_API_TOKEN");
  const mastodonApiBaseUrl = process.env.MASTODON_API_BASE_URL;
  const galleryUrl = process.env.GALLERY_URL;

  const {
    data: { galleries },
  } = await axois.get(galleryUrl);

  const allImages = galleries.flatMap((g) => g.images);
  const imageCount = allImages.length;
  const randomIndex = Math.floor(Math.random() * imageCount);
  const selectedImage = allImages[randomIndex];
  const imageSizes = selectedImage.sizes.filter((s) => (s.type = "webp"));
  const largestSize = imageSizes.reduce((p, c) => (c.x > p.x ? c : p));
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

const secretsManagerClient = new aws.SecretsManager();
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
  const { data } = await axios.get(url);
  const writer = createWriteStream(file);

  return new Promise((resolve, reject) => {
    data.pipe(writer);
    writer.on("error", (err) => {
      writer.close();
      reject(err);
    });
    writer.on("close", () => {
      resolve(true);
    });
  });
}
