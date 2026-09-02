import {
  cleanupE2EEnvironment,
  snapshotDevelopmentState,
} from "../../server/tests/support/e2e-environment.js";

export default async function globalSetup() {
  const developmentBefore = await snapshotDevelopmentState();
  console.log(`Development state before E2E: ${developmentBefore}`);

  return async () => {
    let developmentAfter: string | undefined;
    try {
      developmentAfter = await snapshotDevelopmentState();
    } finally {
      await cleanupE2EEnvironment();
    }

    if (developmentAfter !== developmentBefore) {
      throw new Error(
        "E2E isolation check failed: development database or uploads changed.",
      );
    }

    console.log(`Development database and uploads unchanged: ${developmentAfter}`);
  };
}
