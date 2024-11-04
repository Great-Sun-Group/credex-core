import { clearForce } from "../../utils/endpoints/devadmin";

describe("clearforce DevAdmin Operation", () => {
  it("clearforce", async () => {
    await clearForce();
  });
});
