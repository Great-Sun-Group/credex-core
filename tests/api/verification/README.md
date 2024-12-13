# Image Quality Validation Testing Guide

## Prerequisites

1. AWS Account Setup:
```bash
# Create a .env.test file in project root
AWS_ACCESS_KEY_ID=your_test_access_key
AWS_SECRET_ACCESS_KEY=your_test_secret_key
AWS_REGION=your_test_region
```

2. Required AWS Permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectFaces",
        "rekognition:DetectLabels",
        "textract:AnalyzeDocument"
      ],
      "Resource": "*"
    }
  ]
}
```

## Test Images Setup

Create test fixtures directory and add required test images:

```bash
mkdir -p tests/fixtures/verification

# Required test images:
tests/fixtures/verification/
├── valid-selfie.jpg     # A clear, well-lit selfie photo
│   # Requirements:
│   # - Resolution: ≥ 640x480
│   # - Single clear face
│   # - Good lighting
│   # - Sharp focus
│
├── blurry-selfie.jpg    # An out-of-focus selfie
│   # Characteristics:
│   # - Visible motion blur or out of focus
│   # - Should fail blur detection
│
├── dark-selfie.jpg      # An underexposed selfie
│   # Characteristics:
│   # - Poor lighting conditions
│   # - Should fail lighting check
│
├── no-face.jpg          # Image without a face
│   # Characteristics:
│   # - No human face present
│   # - Should fail face detection
│
├── valid-id.jpg         # A clear ID document
│   # Requirements:
│   # - Resolution: ≥ 640x480
│   # - Clear text
│   # - Good lighting
│   # - Sharp focus
│
├── blurry-id.jpg        # An out-of-focus ID
│   # Characteristics:
│   # - Visible blur
│   # - Should fail quality check
│
├── non-document.jpg     # A non-document image
│   # Characteristics:
│   # - Regular photo, not an ID
│   # - Should fail document detection
│
└── low-res.jpg          # Below minimum resolution
    # Characteristics:
    # - Resolution < 640x480
    # - Should fail resolution check
```

## Running Tests

1. Run all verification tests:
```bash
npm test tests/api/verification
```

2. Run specific test file:
```bash
npm test tests/api/verification/utils/imageQuality.test.ts
```

3. Run with watch mode:
```bash
npm test tests/api/verification -- --watch
```

4. Run specific test:
```bash
npm test tests/api/verification -- -t "validates good quality selfie"
```

## Test Categories

### 1. Resolution Validation
Tests minimum resolution requirements:
- Rejects images below 640x480
- Accepts images meeting requirements
- Verifies dimension reporting

### 2. Selfie Quality Tests
Tests face detection and quality:
- Face presence detection
- Quality metrics (blur, lighting)
- Confidence scoring
- Error cases

### 3. ID Document Tests
Tests document analysis:
- Document detection
- Text extraction
- Quality assessment
- Field extraction

### 4. Error Handling
Tests various error scenarios:
- Invalid image data
- Missing credentials
- Service failures
- Format issues

### 5. Performance Tests
Tests response times and efficiency:
- Validation completion time
- AWS service call efficiency

## Debugging Tests

1. Enable verbose output:
```bash
npm test tests/api/verification -- --verbose
```

2. View AWS service calls:
```bash
# Set AWS SDK logging
AWS_SDK_JS_LOG_LEVEL=debug npm test
```

3. Debug specific test:
```bash
# Add console.log in test file:
console.log(JSON.stringify(result, null, 2));
```

## Common Issues & Solutions

### 1. AWS Credentials
```bash
# Error: Missing credentials
Solution: Check .env.test file exists and is loaded

# Error: Invalid credentials
Solution: Verify AWS permissions are correct
```

### 2. Test Images
```bash
# Error: ENOENT: no such file or directory
Solution: Ensure test images exist in correct location

# Error: Invalid image format
Solution: Verify images are valid JPG/PNG files
```

### 3. Performance
```bash
# Error: Test timeout
Solution: Increase Jest timeout:
jest.setTimeout(30000); // 30 seconds
```

## Best Practices

1. Test Organization:
- Group related tests using describe blocks
- Use clear, descriptive test names
- Test both success and failure cases

2. AWS Usage:
- Use test credentials
- Monitor AWS costs
- Consider test environment limits

3. Performance:
- Group similar tests to minimize AWS calls
- Use appropriate timeouts
- Consider request batching

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
name: Verification Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test tests/api/verification
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_TEST_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_TEST_SECRET_KEY }}
          AWS_REGION: ${{ secrets.AWS_TEST_REGION }}
```

## Monitoring Test Coverage

1. Run tests with coverage:
```bash
npm test tests/api/verification -- --coverage
```

2. Coverage requirements:
- Functions: 90%
- Statements: 85%
- Branches: 80%
- Lines: 85%

## Adding New Tests

1. Follow existing patterns:
```typescript
describe('New Feature', () => {
  test('should handle specific case', async () => {
    const imageBuffer = await fs.readFile(
      path.join(__dirname, '../../../fixtures/verification/test-image.jpg')
    );
    
    const result = await validateImageQuality(imageBuffer, 'selfie', config);
    
    expect(result.isValid).toBe(true);
    // Add specific assertions
  });
});
```

2. Add necessary test fixtures
3. Update README with new test cases
4. Verify AWS permissions if needed
