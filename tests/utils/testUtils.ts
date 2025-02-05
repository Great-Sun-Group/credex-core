/**
 * Utility function to generate random phone numbers for testing
 * @returns A random 9-digit phone number as a string
 */
export const generateRandomPhone = () => {
  // Generate a random 9-digit number
  const randomNum = Math.floor(Math.random() * 900000000) + 100000000;
  return randomNum.toString();
};
