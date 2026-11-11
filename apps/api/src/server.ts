import cors from "@fastify/cors";
import Fastify from "fastify";
import { config } from "./config";
import { marketRoutes } from "./routes/markets";
import { pushRoutes } from "./routes/push";
import { startAutoDispatch, stopAutoDispatch } from "./services/pushDispatchService";

const app = Fastify({ logger: true });

app.register(cors, {
  origin: true
});

app.get("/health", async () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
  finnhubConfigured: Boolean(config.finnhubApiKey),
  expoPushEnabled: config.expoPushEnabled,
  pushAutoDispatchEnabled: config.pushAutoDispatchEnabled,
  pushDispatchIntervalMs: config.pushDispatchIntervalMs
}));

app.register(marketRoutes);
app.register(pushRoutes);

const start = async () => {
  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    app.log.info(`API running at http://localhost:${config.port}`);

    startAutoDispatch((error) => {
      app.log.error(error, "Push auto-dispatch failed");
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

const shutdown = async () => {
  stopAutoDispatch();
  await app.close();
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});

start();
