import axios from "axios";
import { ledgerSpaceDriver } from "../../../config/neo4j";
import { OnboardMemberService } from "../../Member/services/OnboardMember";
import { CreateAccountService } from "../../Account/services/CreateAccount";
import { random } from "lodash";

export async function CreateTestMembersAndAccountsService(numNewAccounts: number) {
  const batchSize = 3; // Size of each batch

  const numNewMembers = Math.round(numNewAccounts * 0.75)
  const numNewAccountsForExisting = numNewAccounts - numNewMembers;

  const memberPromises = [];
  for (let i = 0; i < numNewMembers; i++) {
    memberPromises.push(
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
        const randomNum1 = random(100, 999);
        const randomNum2 = random(100, 999);
        const firstname = "first" + randomNum1;
        const lastname = "last" + randomNum2;

        const phone = "263" + Math.floor(100000000 + Math.random() * 900000000);
        // need to check if phone unique here and generate new if not

        const onboardedMember = await OnboardMemberService(
          firstname,
          lastname,
          firstname + "_" + lastname,
          "USD",
          phone
        );
        if (!onboardedMember.onboardedMemberID) {
          throw new Error("member could not be onboarded");
        }

        const consumptionAccount = await CreateAccountService(
          onboardedMember.onboardedMemberID,
          "PERSONAL_CONSUMPTION",
          `${firstname} ${lastname} Personal`,
          `${firstname}_${lastname}`,
          "USD"
        );

        if (!consumptionAccount.accountID) {
          console.log(consumptionAccount.message);
          throw new Error("new consumption account could not be created");
        }

        return {
          onboardedMemberID: onboardedMember.onboardedMemberID,
          consumptionAccountID: consumptionAccount.accountID,
        };
      })()
    );

    // Process in batches of `batchSize`
    if ((i + 1) % batchSize === 0 || i === numNewMembers - 1) {
      await Promise.all(memberPromises);
      memberPromises.length = 0; // Clear the array for the next batch
    }
  }

  const accountPromises = [];
  for (let i = 0; i < numNewAccountsForExisting; i++) {
    accountPromises.push(
      (async () => {
        var ledgerSpaceSession = ledgerSpaceDriver.session();
        const getRandomMemberQuery = await ledgerSpaceSession.run(`
          MATCH (members:Member)
          WITH members.memberID AS memberID, rand() AS rand
          ORDER BY rand LIMIT 1
          RETURN memberID
        `);
        await ledgerSpaceSession.close();

        const ownerID = getRandomMemberQuery.records[0].get("memberID");
        const businessName = "biz" + random(100000, 999999);

        const newAccount = await CreateAccountService(
          ownerID,
          "BUSINESS",
          businessName,
          businessName,
          "USD"
        );

        if (!newAccount.accountID) {
          console.log(newAccount.message);
          throw new Error("new account could not be created");
        }
      })()
    );

    // Process in batches of `batchSize`
    if ((i + 1) % batchSize === 0 || i === numNewAccountsForExisting - 1) {
      await Promise.all(accountPromises);
      accountPromises.length = 0; // Clear the array for the next batch
    }
  }
  return true;
}
