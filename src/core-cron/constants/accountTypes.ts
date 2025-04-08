export const accountTypes = ["PERSONAL", "TRUST", "OPERATIONS"];

export function checkPermittedAccountType(credexTypeToCheck: string): boolean {
  return accountTypes.includes(credexTypeToCheck);
}