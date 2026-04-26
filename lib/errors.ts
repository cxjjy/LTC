export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = "APP_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function notFound(message = "记录不存在") {
  return new AppError(message, 404, "NOT_FOUND");
}

export function forbidden(message = "无权访问该资源") {
  return new AppError(message, 403, "FORBIDDEN");
}

export function unauthorized(message = "请先登录") {
  return new AppError(message, 401, "UNAUTHORIZED");
}

export function badRequest(message: string) {
  return new AppError(message, 400, "BAD_REQUEST");
}
