/**
 * Utility function to generate random phone numbers for testing
 * @returns A random 9-digit phone number as a string
 */
export const generateRandomPhone = () => {
<<<<<<< HEAD
  // Generate a non-zero first digit (1-9)
  const firstDigit = Math.floor(Math.random() * 9) + 1;
  // Generate remaining digits to ensure uniqueness
  const timestamp = Date.now().toString().slice(-4);
  // Generate a random 4-digit number for the rest
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `${firstDigit}${timestamp}${randomNum}`;
=======
  // Generate a random 9-digit number
  const randomNum = Math.floor(Math.random() * 900000000) + 100000000;
  return randomNum.toString();
>>>>>>> 3877d10 (Added password management)
};
