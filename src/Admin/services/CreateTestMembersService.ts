import axios from 'axios';
import { CreateMemberService } from "../../Member/services/CreateMemberService";

export async function CreateTestMembersService(numNewMembers: number) {
    let membersCreated = []
    let newMember
    // Iterate numNewMembers times
    for (let i = 0; i < numNewMembers; i++) {
        // Fetch a new name for each iteration
        const nameObject = await axios.get("https://api.parser.name/?api_key=f30409d63186d13cfa335a40e14dcd17&endpoint=generate");
        const phone = parseFloat("263" + Math.floor(100000000 + Math.random() * 900000000))
        //need to check if phone unique here and genrate new if not
        const request = {
            "firstname": nameObject.data.data[0].name.firstname.name_ascii,
            "lastname": nameObject.data.data[0].name.lastname.name_ascii,
            "phone": phone,
            "defaultDenom": "USD",
            "memberType": "HUMAN",
            "handle": nameObject.data.data[0].name.firstname.name_ascii+nameObject.data.data[0].name.lastname.name_ascii,
        };
        newMember = await CreateMemberService(request);
        console.log(newMember)
        console.log("Member created: " + request.firstname + " " + request.lastname)
        membersCreated.push(newMember)
    }
    return membersCreated
}