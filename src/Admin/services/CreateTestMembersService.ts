import axios from "axios";
import { CreateMemberService } from "../../Member/services/CreateMemberService";
import { Member } from "../../Member/types/Member";
import { random } from "lodash";
import { v4 as uuidv4 } from "uuid";

export async function CreateTestMembersService(numNewMembers: number) {
  const memberPromises = [];
  const batchSize = 3; // Size of each batch

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
        const randomNum = random(10-99)
        const firstname = "first" + randomNum;
        const lastname = "last" + randomNum;

        const phone = "263" + Math.floor(100000000 + Math.random() * 900000000);
        // need to check if phone unique here and generate new if not
        const request: Member = {
          firstname: firstname,
          lastname: lastname,
          phone: phone,
          defaultDenom: "USD",
          memberType: "HUMAN",
          handle: firstname + "_" + uuidv4(),
        };

        const newMember = await CreateMemberService(request);
        if (typeof newMember.member == "boolean") {
          throw new Error("newMember could not be created");
        }
        if (newMember.member && typeof newMember.member.memberID === "string") {
          console.log("Member created: " + newMember.member.displayName);
          return newMember.member.memberID;
        } else {
          throw new Error("newMember could not be created");
        }
      })()
    );

    // Process in batches of `batchSize`
    if ((i + 1) % batchSize === 0 || i === numNewMembers - 1) {
      await Promise.all(memberPromises);
      memberPromises.length = 0; // Clear the array for the next batch
    }
  }
}
