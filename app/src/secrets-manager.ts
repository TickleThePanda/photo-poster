import aws from "aws-sdk";
import { getRequiredEnv } from "./required-env";

const secretsManagerClient = new aws.SecretsManager();
export async function getSecret(secretName: string) {
  const { SecretString: value } = await secretsManagerClient
    .getSecretValue({
      SecretId: getRequiredEnv(`${secretName}_ASM_NAME`),
    })
    .promise();

  if (value === null || value === undefined) {
    throw new Error(`No such secret ${secretName}`);
  }

  return value;
}
