export const credexTypes = [
    "PURCHASE",
    "GIFT",
]

export function checkPermittedCredexType(credexTypeToCheck: string) {
    if (credexTypes.includes(credexTypeToCheck)) {
      return true;
    }
}