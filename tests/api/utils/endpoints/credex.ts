import { authRequest } from "../request";
import { delay, DELAY_MS } from "../delay";

export async function createCredex(
  memberID: string,
  issuerAccountID: string,
  receiverAccountID: string,
  Denomination: string,
  InitialAmount: number,
  credexType: string,
  OFFERSorREQUESTS: string,
  securedCredex: boolean,
  jwt: string
) {
  console.log("\nCreating credex...");
  const response = await authRequest(
    "/createCredex",
    {
      memberID,
      issuerAccountID,
      receiverAccountID,
      Denomination,
      InitialAmount,
      credexType,
      OFFERSorREQUESTS,
      securedCredex,
    },
    jwt
  );
  console.log("Create credex response:", response.data);
  expect(response.status).toBe(200);
  expect(response.data.createCredexData).toBeTruthy();
  expect(response.data.dashboardData).toBeTruthy();
  await delay(DELAY_MS);
  return response;
}

export async function acceptCredex(
  credexID: string,
  signerID: string,
  jwt: string
) {
  console.log("\nAccepting credex...");
  const response = await authRequest(
    "/acceptCredex",
    {
      credexID,
      signerID,
    },
    jwt
  );
  console.log("Accept credex response:", response.data);
  expect(response.status).toBe(200);
  expect(response.data.acceptCredexData).toBeTruthy();
  expect(response.data.dashboardData).toBeTruthy();
  await delay(DELAY_MS);
  return response;
}

export async function acceptCredexBulk(
  credexIDs: string[],
  signerID: string,
  jwt: string
) {
  console.log("\nAccepting credexes in bulk...");
  const response = await authRequest(
    "/acceptCredexBulk",
    {
      credexIDs,
      signerID,
    },
    jwt
  );
  console.log("Accept bulk response:", response.data);
  expect(response.status).toBe(200);
  expect(response.data.acceptCredexData).toBeTruthy();
  expect(response.data.dashboardData).toBeTruthy();
  await delay(DELAY_MS);
  return response;
}

export async function declineCredex(
  credexID: string,
  signerID: string,
  jwt: string
) {
  console.log("\nDeclining credex...");
  const response = await authRequest(
    "/declineCredex",
    {
      credexID,
      signerID,
    },
    jwt
  );
  console.log("Decline credex response:", response.data);
  expect(response.status).toBe(200);
  await delay(DELAY_MS);
  return response;
}

export async function cancelCredex(
  credexID: string,
  signerID: string,
  jwt: string
) {
  console.log("\nCancelling credex...");
  const response = await authRequest(
    "/cancelCredex",
    {
      credexID,
      signerID,
    },
    jwt
  );
  console.log("Cancel credex response:", response.data);
  expect(response.status).toBe(200);
  await delay(DELAY_MS);
  return response;
}

export async function getCredex(
  credexID: string,
  accountID: string,
  jwt: string
) {
  console.log("\nGetting credex...");
  const response = await authRequest(
    "/getCredex",
    {
      credexID,
      accountID,
    },
    jwt
  );
  console.log("Credex data:", response.data);
  expect(response.status).toBe(200);
  await delay(DELAY_MS);
  return response;
}
