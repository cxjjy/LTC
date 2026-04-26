import { spawn } from "node:child_process";
import path from "node:path";

const projectRoot = process.cwd();

async function run() {
  const nodeBin = process.execPath;
  const cliPath = path.join(projectRoot, "node_modules", "tailwindcss", "lib", "cli.js");
  const args = [
    cliPath,
    "-c",
    "./tailwind.config.ts",
    "-i",
    "./app/globals.css",
    "-o",
    "./app/generated-tailwind.css",
    "--minify"
  ];

  await new Promise((resolve, reject) => {
    const child = spawn(nodeBin, args, {
      cwd: projectRoot,
      stdio: "inherit"
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`样式编译失败，退出码 ${code ?? "unknown"}`));
    });
  });
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "样式编译失败");
  process.exit(1);
});
