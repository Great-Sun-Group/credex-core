import { LoadTest } from '../../utils/loadTesting';

const loadTest = new LoadTest({
  endpoint: '/api/verification/verify',
  rampUpPeriod: 30,  // seconds
  duration: 300,     // seconds
  targetRPS: 100,    // requests per second
  scenarios: [{
    name: 'Photo Verification',
    weight: 1,
    flow: async (context) => {
      // Upload photo
      const uploadResponse = await context.post('/api/verification/upload', {
        type: 'id',
        photo: context.fixtures.validId
      });
      
      // Verify photos
      await context.post('/api/verification/verify', {
        idPhotoKey: uploadResponse.data.key,
        selfiePhotoKey: uploadResponse.data.key
      });
    }
  }]
});

export default loadTest; 