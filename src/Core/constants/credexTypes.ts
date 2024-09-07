export const credexTypes = [
  "PURCHASE",
  "GIFT",
  "DCO_GIVE",
  "DCO_RECEIVE"
];

export function checkPermittedCredexType(credexTypeToCheck: string): boolean {
  return credexTypes.includes(credexTypeToCheck);
}
