import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// Determine if the environment is deployed
export const isDeployed = process.argv.includes("dev");
export const BASE_URL = isDeployed
  ? "https://dev.api.mycredex.app"
  : "http://localhost:5000";

// Create an Axios instance with default headers
export const axiosInstance = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

// ... (keep the existing imports and constants)

export const createTestMembers = async () => {
  const onboardUrl = `${BASE_URL}/v1/onboardMember`;

  const createMember = async (data: any) => {
    const response = await axiosInstance.post(onboardUrl, data);
    return {
      jwt: response.data.token,
      id: response.data.memberDashboard.memberID,
      phone: data.phone,
      personalAccountID: response.data.defaultAccountID,
    };
  };

  const testMember = await createMember({
    firstname: "TestMember",
    lastname: "ForAccountTests",
    phone: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
    defaultDenom: "USD",
    memberTier: 3, // Entrepreneur tier
  });

  const memberToAuthorize = await createMember({
    firstname: "Authorizing",
    lastname: "Member",
    phone: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
    defaultDenom: "USD",
    memberTier: 3,
  });

  console.log("Test members created:", {
    testMember: { id: testMember.id, tier: 3 },
    memberToAuthorize: { id: memberToAuthorize.id, tier: 3 },
  });

  return {
    testMemberJWT: testMember.jwt,
    testMemberID: testMember.id,
    testPersonalAccountID: testMember.personalAccountID,
    testMemberPhone: testMember.phone,
    memberToAuthorizeJWT: memberToAuthorize.jwt,
    memberToAuthorizeID: memberToAuthorize.id,
    memberToAuthorizePhone: memberToAuthorize.phone,
  };
};

export const createTestMemberWithTier = async (tier: number) => {
  const onboardUrl = `${BASE_URL}/v1/onboardMember`;
  const memberData = {
    firstname: "TierTest",
    lastname: "Member",
    phone: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
    defaultDenom: "USD",
    memberTier: tier,
  };

  const response = await axiosInstance.post(onboardUrl, memberData);
  console.log(`Test member created with tier ${tier}:`, {
    id: response.data.memberDashboard.memberID,
    tier: tier,
  });

  return {
    jwt: response.data.token,
    id: response.data.memberDashboard.memberID,
    phone: memberData.phone,
    personalAccountID: response.data.defaultAccountID,
  };
};
