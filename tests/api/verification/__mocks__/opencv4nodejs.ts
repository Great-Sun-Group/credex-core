interface OpencvMock {
  [key: string]: any;
  Mat: jest.Mock;
  Size: jest.Mock;
  Rect: jest.Mock;
  CascadeClassifier: jest.Mock;
  getStructuringElement: jest.Mock;
  cvtColor: jest.Mock;
  gaussianBlur: jest.Mock;
  canny: jest.Mock;
  findContours: jest.Mock;
  detectMultiScaleAsync: jest.Mock;
  getRegion: jest.Mock;
  imdecodeAsync: jest.Mock;
}

const mockSize = jest.fn().mockImplementation((width, height) => ({
  width,
  height
}));

const mockRect = jest.fn().mockImplementation((x, y, width, height) => ({
  x,
  y,
  width,
  height
}));

const mockContour = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  area: 10000,
  arcLength: jest.fn().mockReturnValue(400),
  approxPolyDP: jest.fn().mockReturnValue([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 }
  ]),
  convexHull: jest.fn().mockReturnValue({
    area: 10000
  })
};

const mockDetectMultiScaleAsync = jest.fn().mockResolvedValue([{
  x: 100,
  y: 100,
  width: 200,
  height: 200
}]);

const mockCvtColor = jest.fn().mockReturnThis();
const mockGaussianBlur = jest.fn().mockReturnThis();
const mockCanny = jest.fn().mockReturnThis();
const mockDilate = jest.fn().mockReturnThis();
const mockGetRegion = jest.fn().mockReturnValue({
  width: 100,
  height: 100
});

const mockFindContours = jest.fn().mockReturnValue([mockContour]);

class MockMat {
  cols = 1920;
  rows = 1080;
  size = { width: 1920, height: 1080 };
  
  cvtColor = mockCvtColor;
  gaussianBlur = mockGaussianBlur;
  canny = mockCanny;
  dilate = mockDilate;
  findContours = mockFindContours;
  detectMultiScaleAsync = mockDetectMultiScaleAsync;
  getRegion = mockGetRegion;
}

const mockGetStructuringElement = jest.fn().mockImplementation(() => new MockMat());

class MockCascadeClassifier {
  constructor() {
    this.detectMultiScaleAsync = mockDetectMultiScaleAsync;
  }
  detectMultiScaleAsync: jest.Mock;
}

const mockImdecodeAsync = jest.fn().mockImplementation(() => {
  return Promise.resolve(new MockMat());
});

const opencv: OpencvMock = {
  Mat: jest.fn().mockImplementation(() => new MockMat()),
  Size: mockSize,
  Rect: mockRect,
  CascadeClassifier: jest.fn().mockImplementation(() => new MockCascadeClassifier()),
  getStructuringElement: mockGetStructuringElement,
  cvtColor: mockCvtColor,
  gaussianBlur: mockGaussianBlur,
  canny: mockCanny,
  dilate: mockDilate,
  findContours: mockFindContours,
  detectMultiScaleAsync: mockDetectMultiScaleAsync,
  getRegion: mockGetRegion,
  imdecodeAsync: mockImdecodeAsync,
  
  // Constants
  COLOR_BGR2GRAY: 6,
  CHAIN_APPROX_SIMPLE: 2,
  RETR_EXTERNAL: 0,
  CASCADE_SCALE_IMAGE: 1,
  IMREAD_COLOR: 1,
  MORPH_RECT: 0,
  MORPH_CROSS: 1,
  MORPH_ELLIPSE: 2
};

// Add Jest mock functions to the opencv object itself
Object.keys(opencv).forEach(key => {
  if (typeof opencv[key] === 'function') {
    const mockFn = opencv[key] as jest.Mock;
    mockFn.mockReset = jest.fn();
    mockFn.mockReturnValue = jest.fn();
    mockFn.mockImplementation = jest.fn();
    mockFn.mockReturnValueOnce = jest.fn();
    mockFn.mockImplementationOnce = jest.fn();
  }
});

module.exports = opencv;
