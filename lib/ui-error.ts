export type ApiIssue = {
  path?: Array<string | number>;
  message?: string;
};

export type ApiErrorPayload = {
  success?: boolean;
  error?: string;
  code?: string;
  issues?: ApiIssue[];
};

export type ApiSuccessPayload<T = unknown> = {
  success: true;
  data?: T;
};

const errorMessageMap: Record<string, string> = {
  "请求参数校验失败": "请检查表单信息后重新提交",
  "服务器内部错误": "系统暂时不可用，请稍后重试",
  "用户名或密码错误": "用户名或密码不正确，请重新输入",
  "请先登录": "登录状态已失效，请重新登录",
  "无权访问该资源": "你当前没有权限执行此操作",
  "无权访问该记录": "你当前没有权限查看这条记录",
  "记录不存在": "当前数据不存在，可能已被删除",
  "用户不存在": "当前用户不存在或已被删除"
};

function fieldLabelByPath(path: ApiIssue["path"]) {
  const key = String(path?.[0] ?? "");
  const labels: Record<string, string> = {
    username: "用户名",
    password: "密码",
    name: "名称",
    code: "编码",
    description: "说明",
    customerId: "客户",
    stage: "阶段",
    status: "状态",
    amount: "金额",
    amountReceived: "已收金额",
    receivedDate: "到账日期",
    expectedSignDate: "预计签约日期",
    plannedStartDate: "计划开始日期",
    plannedEndDate: "计划结束日期",
    expectedFinishAt: "预计完成时间",
    impactNote: "影响说明",
    priority: "优先级",
    suggestionIds: "推荐条目",
    reviewNote: "审阅意见",
    returnNote: "退回说明",
    winRate: "赢率",
    roleIds: "角色",
    permissionCodes: "权限",
    email: "邮箱",
    phone: "手机号",
    estimatedRevenue: "预估收入",
    estimatedLaborCost: "人工成本",
    estimatedOutsourceCost: "外包成本",
    estimatedProcurementCost: "采购成本",
    estimatedTravelCost: "差旅成本",
    estimatedOtherCost: "其他成本"
  };
  return labels[key] || "";
}

function normalizeIssueMessage(issue?: ApiIssue) {
  if (!issue?.message) {
    return "";
  }

  const label = fieldLabelByPath(issue.path);

  if (issue.message.includes("Required")) {
    return label ? `请填写${label}` : "请补充完整信息";
  }

  if (label && issue.message.startsWith("Invalid")) {
    return `${label}格式不正确，请重新填写`;
  }

  return issue.message;
}

export function getUserFriendlyError(payload: ApiErrorPayload | null | undefined, fallback: string) {
  if (!payload) {
    return fallback;
  }

  const issueMessage = normalizeIssueMessage(payload.issues?.[0]);
  if (issueMessage) {
    return issueMessage;
  }

  if (payload.error && errorMessageMap[payload.error]) {
    return errorMessageMap[payload.error];
  }

  return payload.error || fallback;
}
