export interface Env {
  AWS_KMS_KEY_ID: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
}

function parseEnv(): Env {
  const {
    AWS_KMS_KEY_ID,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
  } = process.env;

  if (!AWS_KMS_KEY_ID) throw new Error("AWS_KMS_KEY_ID is not defined");
  if (!AWS_ACCESS_KEY_ID) throw new Error("AWS_ACCESS_KEY_ID is not defined");
  if (!AWS_SECRET_ACCESS_KEY)
    throw new Error("AWS_SECRET_ACCESS_KEY is not defined");
  if (!AWS_REGION) throw new Error("AWS_REGION is not defined");

  // Simple UUID format check for AWS_KMS_KEY_ID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(AWS_KMS_KEY_ID))
    throw new Error("AWS_KMS_KEY_ID is not a valid UUID");

  return {
    AWS_KMS_KEY_ID,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
  };
}

export const env = parseEnv();
