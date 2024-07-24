export const credexTypes = [
  "PURCHASE",
  "GIFT",
  "DCO_GIVE",
  "DCO_RECEIVE"
];

export function checkPermittedCredexType(credexTypeToCheck: string) {
  if (credexTypes.includes(credexTypeToCheck)) {
    return true;
  }
}
