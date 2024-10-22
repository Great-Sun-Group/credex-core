export const accountTypes = ["PERSONAL_CONSUMPTION", "TRUST", "OPERATIONS", "CREDEX_FOUNDATION"];

export function checkPermittedAccountType(credexTypeToCheck: string): boolean {
  return accountTypes.includes(credexTypeToCheck);
}