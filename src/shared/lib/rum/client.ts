import { RUMClient } from "@aws-sdk/client-rum";
import { env } from "../../config/env";

export const RUM_REGION = "us-west-1";
export const RUM_APP_MONITOR_NAME = "openclaw_monitor";

export const rumClient = new RUMClient({
  region: RUM_REGION,
  credentials:
    env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});
