export const accountTypes = ["PERSONAL", "TRUST", "OPERATIONS", "CREDEX_FOUNDATION"];

export function checkPermittedAccountType(credexTypeToCheck: string): boolean {
  return accountTypes.includes(credexTypeToCheck);
}