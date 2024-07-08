import axios from "axios";
import { CreateAccountService } from "../../Account/services/CreateAccountService";
import { Account } from "../../Account/types/Account";
import { random } from "lodash";
import { v4 as uuidv4 } from "uuid";

export async function CreateTestAccountsService(numNewAccounts: number) {
  const accountPromises = [];
  const batchSize = 3; // Size of each batch

  for (let i = 0; i < numNewAccounts; i++) {
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
        const request: Account = {
          firstname: firstname,
          lastname: lastname,
          phone: phone,
          defaultDenom: "USD",
          accountType: "HUMAN",
          handle: firstname + "_" + uuidv4(),
        };

        const newAccount = await CreateAccountService(request);
        if (typeof newAccount.account == "boolean") {
          throw new Error("newAccount could not be created");
        }
        if (
          newAccount.account &&
          typeof newAccount.account.accountID === "string"
        ) {
          console.log("Account created: " + newAccount.account.displayName);
          return newAccount.account.accountID;
        } else {
          throw new Error("newAccount could not be created");
        }
      })()
    );

    // Process in batches of `batchSize`
    if ((i + 1) % batchSize === 0 || i === numNewAccounts - 1) {
      await Promise.all(accountPromises);
      accountPromises.length = 0; // Clear the array for the next batch
    }
  }
}
