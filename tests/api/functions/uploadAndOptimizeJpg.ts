import axios from "../../setup";
import fs from "fs";
import path from "path";
import FormData from "form-data";

export async function uploadAndOptimizeJpg(
  token: string,
  imagePath: string,
  name: string,
  drAccountID: string,
  crAccountID?: string
) {
  console.log(`\nUploading and optimizing image "${name}"...`);
  
  // Read the image file as a buffer
  const imageBuffer = fs.readFileSync(imagePath);
  
  // Create form data
  const formData = new FormData();
  formData.append('jpg', imageBuffer, {
    filename: path.basename(imagePath),
    contentType: 'image/jpeg'
  });
  formData.append('name', name);
  formData.append('drAccountID', drAccountID);
  if (crAccountID) {
    formData.append('crAccountID', crAccountID);
  }
  
  // Get headers from form data
  const headers = {
    ...formData.getHeaders(),
    "x-client-api-key": process.env.CLIENT_API_KEY,
    "Authorization": `Bearer ${token}`
  };

  const response = await axios.post(
    "/uploadAndOptimizeJpg",
    formData,
    { headers }
  );

  console.log("uploadAndOptimizeJpg response:", JSON.stringify(response.data, null, 2));
  return response.data;
}
