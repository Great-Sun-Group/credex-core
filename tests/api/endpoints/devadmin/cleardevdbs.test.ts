import { clearDevDBs } from "../../utils/endpoints/devadmin";

describe("clearDevDBs DevAdmin Operation", () => {
  it("clearDevDBs", async () => {
    await clearDevDBs();
  });
});
