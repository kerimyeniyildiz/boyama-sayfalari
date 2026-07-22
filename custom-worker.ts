// The OpenNext worker is generated during the build.
// @ts-expect-error generated module
import handler, { DOQueueHandler } from "./.open-next/worker.js";

export { DOQueueHandler };

type RuntimeEnv = CloudflareEnv & {
  INTERNAL_CRON_SECRET: string;
};

export default {
  async fetch(request: Request, env: RuntimeEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.hostname === "www.boyamasayfasi.com.tr") {
      url.hostname = "boyamasayfasi.com.tr";
      return Response.redirect(url, 308);
    }
    return handler.fetch(request, env, ctx);
  },

  async scheduled(
    _event: ScheduledController,
    env: RuntimeEnv,
    ctx: ExecutionContext
  ) {
    const paths = [
      "/api/internal/publish-scheduled",
      "/api/internal/process-jobs"
    ];

    for (const pathname of paths) {
      const url = new URL(pathname, env.APP_URL);
      ctx.waitUntil(
        handler.fetch(
          new Request(url, {
            method: "POST",
            headers: {
              "x-internal-cron-secret": env.INTERNAL_CRON_SECRET
            }
          }),
          env,
          ctx
        )
      );
    }
  }
} satisfies ExportedHandler<RuntimeEnv>;
