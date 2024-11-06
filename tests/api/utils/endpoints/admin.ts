import { authRequest } from "../request";
import { delay, DELAY_MS } from "../delay";

export async function getMemberDetails(memberID: string, jwt: string) {
  console.log("\nGetting member details...");
  const response = await authRequest("/admin/getMemberDetails", {
    params: { memberID }
  }, jwt);
  console.log("Response:", response.data);
  expect(response.status).toBe(200);
  await delay(DELAY_MS);
  return response;
}

export async function getAccountDetails(accountID: string, jwt: string) {
  console.log("\nGetting account details...");
  const response = await authRequest("/admin/getAccountDetails", {
    params: { accountID }
  }, jwt);
  console.log("Response:", response.data);
  expect(response.status).toBe(200);
  await delay(DELAY_MS);
  return response;
}

export async function updateMemberTier(memberID: string, tier: number, jwt: string) {
  console.log("\nUpdating member tier...");
  const response = await authRequest("/admin/updateMemberTier", {
    memberID,
    tier
  }, jwt);
  console.log("Response:", response.data);
  expect(response.status).toBe(200);
  await delay(DELAY_MS);
  return response;
}

export async function getReceivedCredexOffers(accountID: string, jwt: string) {
  console.log("\nGetting received Credex offers...");
  const response = await authRequest("/admin/getReceivedCredexOffers", {
    params: { accountID }
  }, jwt);
  console.log("Response:", response.data);
  expect(response.status).toBe(200);
  await delay(DELAY_MS);
  return response;
}

export async function getSentCredexOffers(accountID: string, jwt: string) {
  console.log("\nGetting sent Credex offers...");
  const response = await authRequest("/admin/getSentCredexOffers", {
    params: { accountID }
  }, jwt);
  console.log("Response:", response.data);
  expect(response.status).toBe(200);
  await delay(DELAY_MS);
  return response;
}
