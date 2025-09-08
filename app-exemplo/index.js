import express from "express";
import dotenv from "dotenv";

dotenv.config(); // o docker compose injeta via env_file

const app = express();

const APP_NAME = process.env.APP_NAME || "app-exemplo";
const ENV_NAME = process.env.ENV_NAME || process.env.NODE_ENV || "dev";
const PORT = parseInt(process.env.PORT || "3000", 10);
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const FEATURE_FAKE_DATA = (process.env.FEATURE_FAKE_DATA || "false") === "true";
const API_BASE_URL = process.env.API_BASE_URL || null;

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    app: APP_NAME,
    env: ENV_NAME,
    node_env: process.env.NODE_ENV || null,
    log_level: LOG_LEVEL,
    feature_fake_data: FEATURE_FAKE_DATA,
    api_base_url: API_BASE_URL,
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.send(
    `<h1>${APP_NAME}</h1>
     <p>Ambiente: <b>${ENV_NAME}</b></p>
     <p>Tente <code>/health</code></p>`
  );
});

app.listen(PORT, () => {
  console.log(`[${APP_NAME}] iniciado na porta ${PORT} (ENV=${ENV_NAME})`);
});
