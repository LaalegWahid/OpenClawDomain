"use client";

import { useEffect } from "react";

export function RumProvider() {
  useEffect(() => {
    import("aws-rum-web").then(({ AwsRum }) => {
      try {
        new AwsRum("f5446ebc-0937-4e3b-90e1-12fdf4a48f20", "1.0.0", "us-west-1", {
          sessionSampleRate: 1,
          endpoint: "https://dataplane.rum.us-west-1.amazonaws.com",
          telemetries: ["performance", "errors", "http"],
          allowCookies: true,
          enableXRay: false,
          signing: false,
        });
      } catch {
        // silently ignore
      }
    });
  }, []);

  return null;
}