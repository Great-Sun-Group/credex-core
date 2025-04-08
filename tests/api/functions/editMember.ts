import axios from "../../setup";

export async function editMember(
  token: string,
  firstname?: string,
  lastname?: string,
  memberHandle?: string,
  profile_picture_200_jpg?: string,
  profile_picture_600_jpg?: string,
  profile_picture_original_jpg?: string,
  vendorBio?: string
) {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY,
    "Authorization": `Bearer ${token}`
  };

  // Build request body with only provided fields
  const requestBody: any = {};
  if (firstname) requestBody.firstname = firstname;
  if (lastname) requestBody.lastname = lastname;
  if (memberHandle) requestBody.memberHandle = memberHandle;
  if (profile_picture_200_jpg) requestBody.profile_picture_200_jpg = profile_picture_200_jpg;
  if (profile_picture_600_jpg) requestBody.profile_picture_600_jpg = profile_picture_600_jpg;
  if (profile_picture_original_jpg) requestBody.profile_picture_original_jpg = profile_picture_original_jpg;
  if (vendorBio) requestBody.vendorBio = vendorBio;

  console.log("\nUpdating member profile...");
  const response = await axios.post(
    "/editMember",
    requestBody,
    { headers }
  );

  console.log("editMember response:", JSON.stringify(response.data, null, 2));
  return response.data;
}
