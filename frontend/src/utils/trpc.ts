// utils/trpc.ts
import { createTRPCReact } from "@trpc/react-query";
import type { TRPCApiTpe } from "../../../src/trpc/router";
import { createTRPCProxyClient, createWSClient, wsLink } from "@trpc/client";

export const trpc = createTRPCReact<TRPCApiTpe>({});

const wsClient = createWSClient({
  url: `ws://${process.env.OSC_A_HOST ?? "localhost"}:${
    process.env.OSC_A_WS_PORT ?? "8068"
  }`,
});
// configure TRPCClient to use WebSockets transport
export const trpcWs = createTRPCProxyClient<TRPCApiTpe>({
  links: [
    wsLink({
      client: wsClient,
    }),
  ],
});
