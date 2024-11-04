import { getAccountByHandle } from "../utils/endpoints/account";

describe("getAccountByHandle Endpoint Test", () => {
  it("getAccountByHandle", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [accountHandle] = params;
    
    if (!accountHandle) {
      throw new Error("Usage: npm test getaccountbyhandle <accountHandle>");
    }

    await getAccountByHandle(accountHandle, "");
  });
});
