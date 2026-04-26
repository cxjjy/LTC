process.env.NODE_ENV = "development";
process.env.NEXT_RUNTIME = "nodejs";

const mod = await import("../node_modules/next/dist/cli/next-dev.js");

await mod.nextDev(
  {
    port: 3000,
    hostname: "127.0.0.1",
    turbo: false
  },
  "default",
  "."
);
