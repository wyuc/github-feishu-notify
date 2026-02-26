import express from "express";
import { config } from "./config.js";
import { githubRouter } from "./routes/github.js";

const app = express();

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

app.use(githubRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(config.server.port, () => {
  console.log(`GitHub-Feishu-Notify running on port ${config.server.port}`);
  console.log(`Routes configured: ${config.routes.length}`);
  console.log(`User mappings: ${Object.keys(config.userMapping).length}`);
});
