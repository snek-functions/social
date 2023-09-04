import { logger } from "@snek-at/function";

import type { PrismaClient as PrismaClientType } from "@prisma/client";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client") as {
  PrismaClient: typeof PrismaClientType;
};

export const prisma = new PrismaClient({
  log: [
    {
      level: "info",
      emit: "event",
    },
    {
      level: "query",
      emit: "event",
    },
    {
      level: "warn",
      emit: "event",
    },
    {
      level: "error",
      emit: "event",
    },
  ],
});

prisma.$on("info", (e) => {
  logger.debug(`[${e.timestamp}] [DEBUG] [Prisma] ${e.target}: ${e.message}`);
});

prisma.$on("query", (e) => {
  logger.debug(
    `[${e.timestamp}] [DEBUG] [Prisma] ${e.target}: ${e.query} (params: ${e.params}, duration: ${e.duration}ms)`
  );
});

prisma.$on("warn", (e) => {
  logger.warn(`[${e.timestamp}] [WARNING] [Prisma] ${e.target}: ${e.message}`);
});

prisma.$on("error", (e) => {
  logger.error(`[${e.timestamp}] [ERROR] [Prisma] ${e.target}: ${e.message}`);
});
