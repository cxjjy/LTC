const [major] = process.versions.node.split(".").map(Number);

if (major !== 20) {
  console.error(
    `LTC 当前要求使用 Node 20 运行，检测到的是 Node ${process.versions.node}。请先切换到 Node 20 再启动服务。`
  );
  process.exit(1);
}
