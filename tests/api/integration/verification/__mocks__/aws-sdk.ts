const mockS3 = {
  putObject: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  })
};

const mockTextract = {
  detectDocumentText: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({ Blocks: [] })
  })
};

export const S3 = jest.fn(() => mockS3);
export const Textract = jest.fn(() => mockTextract);

// Export the mocks so tests can access them
export const mocks = {
  s3: mockS3,
  textract: mockTextract
};
