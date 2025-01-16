export const validateStatusCode = jest.fn((status: number, expected: number) => {
  if (status !== expected) {
    throw new Error(`Expected status ${expected} but got ${status}`);
  }
});

export const validateAction = jest.fn((action: any) => {
  if (!action || typeof action !== 'object') {
    throw new Error('Invalid action object');
  }
  if (!action.details || typeof action.details !== 'object') {
    throw new Error('Invalid action details');
  }
  return true;
});

export const validateImageQuality = jest.fn((buffer: Buffer) => {
  // Mock image validation
  if (buffer.length < 1000) { // Simple size check for mock
    throw new Error('Image quality validation failed');
  }
  return {
    isValid: true,
    dimensions: { width: 1280, height: 720 },
    format: 'image/jpeg'
  };
});
