# Verification Tests

## Test Categories

### Unit Tests
- Services tests
- Controller tests
- Utility function tests

### Integration Tests
- End-to-end verification flows
- Cross-service interactions
- Error scenarios

### Performance Tests
- Response time tests
- Concurrent request handling
- Resource usage monitoring

### Load Tests
- Sustained load testing
- Burst load testing
- Error rate monitoring

## Running Tests

```bash
# Run all verification tests
npm test verification

# Run specific test categories
npm test verification:unit
npm test verification:integration
npm test verification:performance
npm test verification:load

# Generate coverage report
npm test verification:coverage
```

## Test Data
Test images are stored in `tests/fixtures/verification/`
- valid-id.jpg: Valid ID document
- valid-selfie.jpg: Valid selfie photo
- blurry-id.jpg: Low quality image
- multiple-faces.jpg: Invalid selfie with multiple faces

## Coverage Requirements
- Minimum 80% overall coverage
- 90% coverage for critical paths
- 100% coverage for security-related code
