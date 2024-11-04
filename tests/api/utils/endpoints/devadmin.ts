import { authRequest } from "../request";
import { delay, DELAY_MS } from "../delay";

export async function clearDevDBs() {
  console.log("\nClearing dev DBs...");
  const response = await authRequest("/devadmin/clearDevDBs", {});
  console.log("Clear DBs response:", response.data);
  expect(response.status).toBe(200);
  await delay(DELAY_MS);
  return response;
}

export async function forceDCO() {
  console.log("\nForcing DCO...");
  const response = await authRequest("/devadmin/forceDCO", {});
  console.log("Force DCO response:", response.data);
  expect(response.status).toBe(200);
  await delay(DELAY_MS);
  return response;
}

export async function clearForce() {
  await clearDevDBs();
  await forceDCO();
}
