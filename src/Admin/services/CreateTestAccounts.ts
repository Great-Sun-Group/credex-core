import axios from "axios";
import { OnboardHumanService } from "../../Human/services/OnboardHuman";
import { CreateAccountService } from "../../Account/services/CreateAccount";
import { random } from "lodash";

export async function CreateTestAccountsService(numNewAccounts: number) {
  const numNewHumans = Math.round(numNewAccounts * 0.75); // 75% of new accounts new humans
  const numNewAccountsForExistingHumans = numNewAccounts - numNewHumans; // remainder new accounts for existing humans
  const accountPromises = [];
  const batchSize = 3; // Size of each batch

  for (let i = 0; i < numNewHumans; i++) {
    accountPromises.push(
      (async () => {
        // Fetch a new name for each iteration
        /*
        // comment out when daily limit reached        
        const nameObject = await axios.get(
          "https://api.parser.name/?api_key=f30409d63186d13cfa335a40e14dcd17&endpoint=generate"
        );
        const firstname = nameObject.data.data[0].name.firstname.name_ascii;
        const lastname = nameObject.data.data[0].name.lastname.name_ascii;
                */
        // comment out when name coming from query above
        const randomNum = random(10 - 99);
        const firstname = "first" + randomNum;
        const lastname = "last" + randomNum;

        const phone = "263" + Math.floor(100000000 + Math.random() * 900000000);
        // need to check if phone unique here and generate new if not

        const onboardedHuman = await OnboardHumanService(
          firstname,
          lastname,
          "USD",
          phone,
          null,
          null
        );
        if (!onboardedHuman.onboardedHumanID) {
          throw new Error("human could not be onboarded");
        }

        const consumptionAccount = await CreateAccountService(
          onboardedHuman.onboardedHumanID,
          "CONSUMPTION",
          `${firstname} ${lastname}`,
          `${firstname}_${lastname}`,
          "USD"
        );

        if (!consumptionAccount.accountID) {
          console.log(consumptionAccount.message);
          throw new Error("new consumption account could not be created");
        }

        return {
          onboardedHumanID: onboardedHuman.onboardedHumanID,
          consumptionAccountID: consumptionAccount.accountID,
        };
      })()
    );

    // Process in batches of `batchSize`
    if ((i + 1) % batchSize === 0 || i === numNewAccounts - 1) {
      await Promise.all(accountPromises);
      accountPromises.length = 0; // Clear the array for the next batch
    }
  }
}
