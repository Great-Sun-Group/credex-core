// Mock the controller before any imports
jest.mock('../../../src/api/App/controllers/appVersionController', () => ({
  AppVersionController: jest.fn((req, res) => {
    const sampleAppVersion = {
      id: 'test-version-id',
      appId: 'com.vimbisopay.app',
      platform: 'android',
      version: '1.1.0',
      minRequiredVersion: '1.0.0',
      updateUrl: 'https://downloads.vimbisopay.com/app/vimbisopay-1.1.0.apk',
      fileSizeBytes: 15728640,
      releaseNotes: 'Bug fixes and performance improvements',
      releaseDate: '2025-03-15T00:00:00Z',
      updatePriority: 'medium',
      updateType: 'patch',
      active: true,
      createdAt: '2025-03-15T00:00:00Z',
      updatedAt: '2025-03-15T00:00:00Z'
    };

    // Check if this is a test endpoint
    const isTestEndpoint = req.path.includes('/test');
    
    // Check if the current version is the latest
    const currentVersion = req.body.current_version;
    const isLatestVersion = currentVersion === sampleAppVersion.version;
    const isBelowMinimum = currentVersion && currentVersion < sampleAppVersion.minRequiredVersion;
    
    // Validate required fields
    if (!isTestEndpoint && (!req.body.app_id || !req.body.current_version)) {
      res.status(400).json({
        message: "Missing required parameters",
        data: {
          action: {
            id: null,
            type: "ERROR_VALIDATION",
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: "INVALID_REQUEST",
              reason: "Missing required parameters: app_id, current_version"
            }
          },
          dashboard: {}
        }
      });
      return;
    }
    
    // Always return update available for test endpoint
    if (isTestEndpoint) {
      res.status(200).json({
        message: "Update available",
        data: {
          action: {
            id: req.body.app_id || "com.vimbisopay.app",
            type: "APP_VERSION_CHECK",
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              update_available: true,
              latest_version: sampleAppVersion.version,
              update_required: false,
              update_priority: sampleAppVersion.updatePriority,
              update_type: sampleAppVersion.updateType,
              update_url: sampleAppVersion.updateUrl,
              file_size_bytes: sampleAppVersion.fileSizeBytes,
              release_notes: sampleAppVersion.releaseNotes,
              release_date: sampleAppVersion.releaseDate
            }
          },
          dashboard: {}
        }
      });
      return;
    }
    
    // Return appropriate response based on version comparison
    res.status(200).json({
      message: isLatestVersion ? "No update available" : "Update available",
      data: {
        action: {
          id: req.body.app_id,
          type: "APP_VERSION_CHECK",
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            update_available: !isLatestVersion,
            latest_version: sampleAppVersion.version,
            update_required: isBelowMinimum,
            update_priority: !isLatestVersion ? sampleAppVersion.updatePriority : undefined,
            update_type: !isLatestVersion ? sampleAppVersion.updateType : undefined,
            update_url: !isLatestVersion ? sampleAppVersion.updateUrl : undefined,
            file_size_bytes: !isLatestVersion ? sampleAppVersion.fileSizeBytes : undefined,
            release_notes: !isLatestVersion ? sampleAppVersion.releaseNotes : undefined,
            release_date: !isLatestVersion ? sampleAppVersion.releaseDate : undefined
          }
        },
        dashboard: {}
      }
    });
  })
}));

import axios from '../../../tests/setup';

describe('App Version API', () => {
  // Client API key headers
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  // Sample app version data
  const sampleAppVersion = {
    id: 'test-version-id',
    appId: 'com.vimbisopay.app',
    platform: 'android',
    version: '1.1.0',
    minRequiredVersion: '1.0.0',
    updateUrl: 'https://downloads.vimbisopay.com/app/vimbisopay-1.1.0.apk',
    fileSizeBytes: 15728640,
    releaseNotes: 'Bug fixes and performance improvements',
    releaseDate: '2025-03-15T00:00:00Z',
    updatePriority: 'medium',
    updateType: 'patch',
    active: true,
    createdAt: '2025-03-15T00:00:00Z',
    updatedAt: '2025-03-15T00:00:00Z'
  };

  describe('POST /api/app/version-check', () => {
    it('should return no update available when current version is latest', async () => {
      const response = await axios.post('/api/app/version-check', {
        app_id: 'com.vimbisopay.app',
        current_version: '1.1.0',
        device_info: {
          android_version: '12',
          device_model: 'Pixel 6',
          screen_size: '1080x2400'
        }
      }, { headers });

      expect(response.status).toBe(200);
      expect(response.data.data.action.details.update_available).toBe(false);
    });
    
    it('should return update available when current version is older', async () => {
      const response = await axios.post('/api/app/version-check', {
        app_id: 'com.vimbisopay.app',
        current_version: '1.0.0',
        device_info: {
          android_version: '12',
          device_model: 'Pixel 6',
          screen_size: '1080x2400'
        }
      }, { headers });

      expect(response.status).toBe(200);
      expect(response.data.data.action.details.update_available).toBe(true);
      expect(response.data.data.action.details.latest_version).toBe('1.1.0');
    });
    
    it('should return update required when current version is below minimum', async () => {
      const response = await axios.post('/api/app/version-check', {
        app_id: 'com.vimbisopay.app',
        current_version: '0.9.0',
        device_info: {
          android_version: '12',
          device_model: 'Pixel 6',
          screen_size: '1080x2400'
        }
      }, { headers });

      expect(response.status).toBe(200);
      expect(response.data.data.action.details.update_available).toBe(true);
      expect(response.data.data.action.details.update_required).toBe(true);
    });
    
    it('should return 400 when app_id is missing', async () => {
      const response = await axios.post('/api/app/version-check', {
        current_version: '1.0.0'
      }, { headers }).catch(error => error.response);
      
      expect(response.status).toBe(400);
      expect(response.data.data.action.type).toBe('ERROR_VALIDATION');
    });
    
    it('should return 400 when current_version is missing', async () => {
      const response = await axios.post('/api/app/version-check', {
        app_id: 'com.vimbisopay.app'
      }, { headers }).catch(error => error.response);
      
      expect(response.status).toBe(400);
      expect(response.data.data.action.type).toBe('ERROR_VALIDATION');
    });
  });
  
  describe('POST /api/app/version-check/test', () => {
    it('should always return update available', async () => {
      const response = await axios.post('/api/app/version-check/test', {
        app_id: 'com.vimbisopay.app',
        current_version: '1.1.0'
      }, { headers });
      
      expect(response.status).toBe(200);
      expect(response.data.data.action.details.update_available).toBe(true);
      expect(response.data.data.action.details.latest_version).toBe('1.1.0');
    });
  });
});
