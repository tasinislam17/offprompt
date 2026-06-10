import "dotenv/config";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { loadPromptPairs } from "./prompts/promptRepository.js";
import { createRoomManager } from "./rooms/roomManager.js";
import { registerSocketHandlers } from "./sockets/registerSocketHandlers.js";
import { logger } from "./utils/logger.js";

const isProduction = process.env.NODE_ENV === "production";
const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const moduleDir = dirname(fileURLToPath(import.meta.url));
const clientDistPath = resolve(moduleDir, "../../client/dist");

const app = express();
const httpServer = createServer(app);

const configuredOrigins = (process.env.CLIENT_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOrigin: cors.CorsOptions["origin"] = (origin, callback) => {
  if (!origin || configuredOrigins.length === 0 || configuredOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.)/.test(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error("Origin is not allowed by CORS."));
};

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "32kb" }));

const prompts = loadPromptPairs();
const roomManager = createRoomManager(prompts);

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "off-prompt",
    promptPairs: prompts.length,
    uptimeSeconds: Math.round(process.uptime()),
  });
});

if (isProduction) {
  app.use(express.static(clientDistPath));
  app.get("*", (_request, response) => {
    response.sendFile(resolve(clientDistPath, "index.html"));
  });
}

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
  },
  pingInterval: 25_000,
  pingTimeout: 60_000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 120_000,
    skipMiddlewares: true,
  },
});

registerSocketHandlers(io, roomManager);

const cleanupInterval = setInterval(() => {
  roomManager.cleanupExpiredRooms();
}, 60_000);
cleanupInterval.unref();

httpServer.listen(port, "0.0.0.0", () => {
  logger.info("Off Prompt server listening", {
    port,
    mode: process.env.NODE_ENV ?? "development",
    promptPairs: prompts.length,
  });
});
