const mockMetadata = jest.fn().mockResolvedValue({
  format: 'jpeg',
  width: 1920,
  height: 1080,
  size: 500000
});

const mockToFormat = jest.fn().mockReturnThis();
const mockToBuffer = jest.fn().mockResolvedValue(Buffer.from('mock jpeg data'));

const sharp = Object.assign(
  jest.fn().mockImplementation(() => ({
    metadata: mockMetadata,
    toFormat: mockToFormat,
    toBuffer: mockToBuffer
  })),
  {
    AUTO: 'auto',
    JPEG: 'jpeg',
    PNG: 'png'
  }
);

// Export both default and named exports
module.exports = sharp;
module.exports.default = sharp;
module.exports.AUTO = sharp.AUTO;
module.exports.JPEG = sharp.JPEG;
module.exports.PNG = sharp.PNG;
