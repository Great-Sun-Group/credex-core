afterAll(async () => {
  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 500));
}); 