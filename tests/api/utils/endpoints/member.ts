import { authRequest } from "../request";
import { delay, DELAY_MS } from "../delay";

export async function onboardMember(firstname: string, lastname: string, phone: string, defaultDenom: string) {
  console.log("\nOnboarding member...");
  const response = await authRequest("/onboardMember", {
    firstname,
    lastname,
    phone,
    defaultDenom
  });
  console.log("Onboard response:", response.data);
  expect(response.status).toBe(201);
  await delay(DELAY_MS);
  return response;
}

export async function getMemberByHandle(memberHandle: string, jwt: string) {
  console.log("\nGetting member by handle...");
  const response = await authRequest("/getMemberByHandle", { 
    memberHandle 
  }, jwt);
  console.log("Member data:", response.data);
  expect(response.status).toBe(200);
  await delay(DELAY_MS);
  return response;
}

export async function getMemberDashboardByPhone(phone: string, jwt: string) {
  console.log("\nGetting member dashboard...");
  const response = await authRequest("/getMemberDashboardByPhone", {
    phone
  }, jwt);
  console.log("Dashboard response:", response.data);
  expect(response.status).toBe(200);
  await delay(DELAY_MS);
  return response;
}
