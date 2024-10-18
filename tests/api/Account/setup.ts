import axios from "axios";

// Determine if the environment is deployed
export const isDeployed = process.argv.includes("dev");
export const BASE_URL = isDeployed ? "https://dev.api.mycredex.app" : "http://localhost:5000";

// Create an Axios instance with default headers
export const axiosInstance = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Creates test members required for account tests.
 * @returns An object containing JWTs and IDs of the created members.
 */
export const createTestMembers = async () => {
  // URLs for onboarding members
  const onboardUrl = `${BASE_URL}/api/v1/member/onboardMember`;
  const authorizeOnboardUrl = `${BASE_URL}/api/v1/member/onboardMember`;

  // Generate random phone numbers for uniqueness
  const phoneNumber = Math.floor(100000000000 + Math.random() * 900000000000).toString();
  const authorizePhoneNumber = Math.floor(100000000000 + Math.random() * 900000000000).toString();

  // Data for test member
  const memberData = {
    firstname: "TestMember",
    lastname: "ForAccountTests",
    phone: phoneNumber,
    defaultDenom: "USD",
  };

  // Data for member to authorize
  const authorizeMemberData = {
    firstname: "Authorizing",
    lastname: "Member",
    phone: authorizePhoneNumber,
    defaultDenom: "USD",
  };

  // Variables to store member details
  let testMemberJWT: string;
  let testMemberID: string;
  let testPersonalAccountID: string;
  let testMemberPhone: string;

  let memberToAuthorizeJWT: string;
  let memberToAuthorizeID: string;
  let memberToAuthorizePhone: string;

  try {
    // Create Test Member
    const response = await axiosInstance.post(onboardUrl, memberData);
    testMemberJWT = response.data.token;
    testMemberID = response.data.memberDashboard.memberID;
    testPersonalAccountID = response.data.defaultAccountID;
    testMemberPhone = phoneNumber;
    console.log("Test member created with ID:", testMemberID);

    // Create Member to Authorize
    const authorizeResponse = await axiosInstance.post(authorizeOnboardUrl, authorizeMemberData);
    memberToAuthorizeJWT = authorizeResponse.data.token;
    memberToAuthorizeID = authorizeResponse.data.memberDashboard.memberID;
    memberToAuthorizePhone = authorizePhoneNumber;
    console.log("Member to authorize created with ID:", memberToAuthorizeID);

    // Return all necessary details
    return {
      testMemberJWT,
      testMemberID,
      testPersonalAccountID,
      testMemberPhone,
      memberToAuthorizeJWT,
      memberToAuthorizeID,
      memberToAuthorizePhone,
    };
  } catch (error) {
    console.error("Error in setup (creating test members):", error);
    throw error;
  }
};
