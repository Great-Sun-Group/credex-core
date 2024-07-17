export const accountTypes = ["PERSONAL_CONSUMPTION", "BUSINESS", "CREDEX_FOUNDATION"];

export function checkPermittedAccountType(credexTypeToCheck: string) {
  if (accountTypes.includes(credexTypeToCheck)) {
    return true;
  }
}
