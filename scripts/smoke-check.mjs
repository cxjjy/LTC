const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...options
  });
}

async function login(username, password) {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  const payload = await response.json();
  assert(response.ok, `登录失败: ${username}`);
  assert(payload.success, `登录接口未返回 success: ${username}`);

  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert(cookie, `登录后未返回会话 cookie: ${username}`);
  return cookie;
}

async function getHtml(path, cookie) {
  const response = await request(path, {
    headers: cookie ? { Cookie: cookie } : undefined
  });
  return {
    response,
    html: await response.text()
  };
}

async function main() {
  const results = [];

  const loginPage = await request("/login");
  assert(loginPage.status === 200, "登录页不可访问");
  results.push("PASS login page");

  const salesCookie = await login("sales", "123456");
  results.push("PASS sales login");

  const customersPage = await getHtml("/customers", salesCookie);
  assert(customersPage.response.status === 200, "sales 无法访问客户列表");
  const customerIdMatch = customersPage.html.match(/\/customers\/(cm[a-z0-9]+)/i);
  assert(customerIdMatch?.[1], "未能从客户列表提取详情 ID");
  results.push("PASS customer list");

  const customerDetail = await request(`/customers/${customerIdMatch[1]}`, {
    headers: { Cookie: salesCookie }
  });
  assert(customerDetail.status === 200, "sales 无法访问客户详情");
  results.push("PASS customer detail");

  const deliveriesPage = await request("/deliveries", {
    headers: { Cookie: salesCookie }
  });
  assert(
    deliveriesPage.status === 307 && deliveriesPage.headers.get("location") === "/forbidden",
    "sales 访问无权限模块未正确跳转 forbidden"
  );
  results.push("PASS forbidden redirect");

  const contractsPage = await getHtml("/contracts", salesCookie);
  assert(contractsPage.response.status === 200, "sales 无法访问合同列表");
  assert(!contractsPage.html.includes(">新增<"), "sales 在合同列表仍能看到新增按钮");
  results.push("PASS contract create hidden");

  const adminCookie = await login("admin", "123456");
  results.push("PASS admin login");

  const systemUsersPage = await request("/system/users", {
    headers: { Cookie: adminCookie }
  });
  assert(systemUsersPage.status === 200, "admin 无法访问用户管理");
  results.push("PASS system users");

  console.log(results.join("\n"));
}

main().catch((error) => {
  console.error(`SMOKE FAILED: ${error.message}`);
  process.exit(1);
});
