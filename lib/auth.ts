// 助理端用一段「祕密路徑」做最簡單的保護。
// 不是真正的身份認證，只是讓網址不可猜。
export function isValidStaffPath(path: string | undefined): boolean {
  const secret = process.env.STAFF_SECRET_PATH;
  if (!secret) return false;
  if (!path) return false;
  return path === secret;
}

export function getStaffPath(): string {
  return process.env.STAFF_SECRET_PATH ?? "";
}
