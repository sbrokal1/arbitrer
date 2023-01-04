import { applyWSSHandler } from "@trpc/server/adapters/ws";
import ws from "ws";
import { router } from "./router";

const wss = new ws.Server({
  port: 8068,
});
const handler = applyWSSHandler({ wss, router });

wss.on("connection", (ws) => {
  console.log(`➕➕ Connection (${wss.clients.size})`);
  ws.once("close", () => {
    console.log(`➖➖ Connection (${wss.clients.size})`);
  });
});
console.log("✅ WebSocket Server listening on ws://localhost:8068");

process.on("SIGTERM", () => {
  console.log("SIGTERM");
  handler.broadcastReconnectNotification();
  wss.close();
});
