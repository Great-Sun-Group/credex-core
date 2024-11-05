import { forceDCO } from "../../utils/endpoints/devadmin";

describe("forceDCO DevAdmin Operation", () => {
  it("forceDCO", async () => {
    await forceDCO();
  });
});
