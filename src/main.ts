#!/usr/bin/env tsx

import { onShutdown } from "node-graceful-shutdown";
import { createBot } from "#root/bot/index.js";
import { config } from "#root/config.js";
import { logger } from "#root/logger.js";
import { createServer } from "#root/server/index.js";
import { initializeMongoose } from "#root/database/mongo.js";

try {
  const bot = createBot(config.BOT_TOKEN);
  const server = await createServer(bot);
  process.on("unhandledRejection", (error) => logger.error(error));

  // Graceful shutdown
  onShutdown(async () => {
    logger.info("shutdown");

    await server.close();
    await bot.stop();
  });

  await initializeMongoose();
  if (config.BOT_MODE === "webhook") {
    await bot.init();

    await server.listen({
      host: config.BOT_SERVER_HOST,
      port: config.BOT_SERVER_PORT,
    });

    await bot.api.setWebhook(config.BOT_WEBHOOK, {
      allowed_updates: config.BOT_ALLOWED_UPDATES,
    });
  } else if (config.BOT_MODE === "polling") {
    await bot.start({
      allowed_updates: config.BOT_ALLOWED_UPDATES,
      onStart: ({ username }) =>
        logger.info({
          msg: "bot running...",
          username,
        }),
    });
  }
} catch (error) {
  logger.error(error);
  process.exit(1);
}
