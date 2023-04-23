import { Axios } from "axios";
import { login } from "masto";
import aws from "aws-sdk";

export async function handler(event, context) {
  const mastodonApiToken = getSecret("MASTODON_API_TOKEN");
  const mastodonApiBaseUrl = process.env.MASTODON_API_BASE_URL;
  const galleryUrl = process.env.GALLERY_URL;

  const masto = await login({
    url: mastodonApiBaseUrl,
    accessToken: mastodonApiToken,
  });

  const status = await masto.v1.statuses.create({
    status: "Hello from #mastojs!",
    visibility: "public",
  });

  return context.logStreamName;
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
