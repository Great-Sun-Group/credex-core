import axios from "axios";
import { CreateMemberService } from "../../Member/services/CreateMemberService";
import { Member } from "../../Member/types/Member";

export async function CreateTestMembersService(numNewMembers: number) {
  const memberPromises = [];

  for (let i = 0; i < numNewMembers; i++) {
    memberPromises.push(
      (async () => {
        // Fetch a new name for each iteration
        const nameObject = await axios.get(
          "https://api.parser.name/?api_key=f30409d63186d13cfa335a40e14dcd17&endpoint=generate"
        );
        const phone = "263" + Math.floor(100000000 + Math.random() * 900000000);
        // need to check if phone unique here and generate new if not
        const request: Member = {
          firstname: nameObject.data.data[0].name.firstname.name_ascii,
          lastname: nameObject.data.data[0].name.lastname.name_ascii,
          phone: phone,
          defaultDenom: "USD",
          memberType: "HUMAN",
          handle:
            nameObject.data.data[0].name.firstname.name_ascii +
            nameObject.data.data[0].name.lastname.name_ascii,
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
  }

  const membersCreated = await Promise.all(memberPromises);
  return membersCreated;
}
