import { authRequest } from "../request";
import { delay, DELAY_MS } from "../delay";

export async function getAccountByHandle(accountHandle: string, jwt: string) {
  console.log("\nGetting account by handle...");
  const response = await authRequest("/getAccountByHandle", { 
    accountHandle 
  }, jwt);
  console.log("Account data:", response.data);
  expect(response.status).toBe(200);
  await delay(DELAY_MS);
  return response;
}

export async function getLedger(accountID: string, jwt: string) {
  console.log("\nGetting ledger...");
  const response = await authRequest("/getLedger", { 
    accountID 
  }, jwt);
  console.log("Ledger data:", response.data);
  expect(response.status).toBe(200);
  await delay(DELAY_MS);
  return response;
}
