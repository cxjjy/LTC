import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const candidates = ["/usr/local/bin/node", process.execPath];

async function getNodeMajor(bin) {
  return new Promise((resolve) => {
    if (!existsSync(bin)) {
      resolve(null);
      return;
    }

    const child = spawn(bin, ["-p", "process.versions.node.split('.')[0]"], {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "ignore"]
    });

    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }

      const parsed = Number(output.trim());
      resolve(Number.isFinite(parsed) ? parsed : null);
    });
  });
}

async function resolveStyleBuilderNode() {
  for (const candidate of candidates) {
    const major = await getNodeMajor(candidate);
    if (major && major >= 22) {
      return candidate;
    }
  }

  throw new Error("未找到可用于 Tailwind 样式编译的 Node 22 运行时，请确认 /usr/local/bin/node 可用。");
}

async function run() {
  const nodeBin = await resolveStyleBuilderNode();
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
