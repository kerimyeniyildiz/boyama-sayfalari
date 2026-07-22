import "server-only";

import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";

export const getDb = cache(() => {
  const { env } = getCloudflareContext();
  const adapter = new PrismaD1(env.DB);
  return new PrismaClient({ adapter });
});

// Keep the existing call sites readable while resolving a request-scoped client.
// React cache guarantees that delegates and transactions share the same client
// during a single request without leaking D1 state between Worker invocations.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getDb();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  }
});
