require("dotenv").config();
import express from "express";
import { env } from "./env.schema";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { loadStateFromDB, router } from "./trpc/router";
import cors from "cors";
require("./trpc/wServer");

const app = express();
const port = env.PORT;

app.use(cors());

app.use(
  "/trpc",
  createExpressMiddleware({
    router,
  })
);

loadStateFromDB();

app.listen(port, () => {
  console.log(`TRPC server hosted on port ${port}`);
});
