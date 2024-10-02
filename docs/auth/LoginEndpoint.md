# Login Endpoint Documentation

## Endpoint: `/member/login`

This endpoint is used for both new and existing members to log in or attempt to access the system.

### Request

- **Method:** POST
- **Headers:** No special authentication headers required
- **Body:**
  ```json
  {
    "phone": "string"
  }
  ```
  The `phone` should be a valid international phone number.

### Responses

#### Successful Login (Existing Member)

- **Status Code:** 200 OK
- **Body:**
  ```json
  {
    "token": "string"
  }
  ```
  The `token` is a JWT that can be used for subsequent authenticated requests.

#### Failed Login (No Matching Member or Invalid Phone)

- **Status Code:** 400 Bad Request
- **Body:**
  ```json
  {
    "message": "string"
  }
  ```
  The `message` will provide details about the failure, such as "Failed to login member" or a more specific error message.

### Notes

- The same 400 status code is used for both invalid phone numbers and failed logins (including non-existent members).
- To distinguish between these cases, check the specific error message in the response body.
- For security reasons, the API does not explicitly state whether a member exists or not.