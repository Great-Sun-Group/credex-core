export const accountTypes = ["PERSONAL_CONSUMPTION", "BUSINESS", "CREDEX_FOUNDATION"];

export function checkPermittedAccountType(credexTypeToCheck: string): boolean {
  return accountTypes.includes(credexTypeToCheck);
}