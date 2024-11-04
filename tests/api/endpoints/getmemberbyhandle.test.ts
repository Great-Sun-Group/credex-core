import { getMemberByHandle } from "../utils/endpoints/member";

describe("getMemberByHandle Endpoint Test", () => {
  it("getMemberByHandle", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone, memberHandle] = params;
    
    if (!phone || !memberHandle) {
      throw new Error("Usage: npm test getmemberbyhandle <phone> <memberHandle>");
    }

    await getMemberByHandle(memberHandle, "");
  });
});
