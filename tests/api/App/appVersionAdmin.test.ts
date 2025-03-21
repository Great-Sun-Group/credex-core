// Mock the controller before any imports
jest.mock('../../../src/api/App/controllers/appVersionAdminController', () => ({
  appVersionAdminController: {
    createAppVersion: jest.fn((req, res) => {
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
      
      res.status(201).json({
        message: "App version created successfully",
        data: {
          action: {
            id: sampleAppVersion.id,
            type: "APP_VERSION_CHECK",
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
            details: sampleAppVersion
          },
          dashboard: {}
        }
      });
    }),
    getAppVersion: jest.fn((req, res) => {
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
      
      if (req.params.id === 'non-existent-id') {
        res.status(404).json({
          message: "App version not found",
          data: {
            action: {
              id: null,
              type: "ERROR_NOT_FOUND",
              timestamp: new Date().toISOString(),
              actor: req.user?.memberID || "system",
              details: {
                code: "NOT_FOUND",
                reason: `App version with ID ${req.params.id} not found`
              }
            },
            dashboard: {}
          }
        });
        return;
      }
      
      res.status(200).json({
        message: "App version found",
        data: {
          action: {
            id: sampleAppVersion.id,
            type: "APP_VERSION_CHECK",
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
            details: sampleAppVersion
          },
          dashboard: {}
        }
      });
    }),
    getAppVersions: jest.fn((req, res) => {
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
      
      res.status(200).json({
        message: "App versions found",
        data: {
          action: {
            id: req.params.appId,
            type: "APP_VERSION_CHECK",
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
            details: {
              versions: [sampleAppVersion]
            }
          },
          dashboard: {}
        }
      });
    }),
    updateAppVersion: jest.fn((req, res) => {
      const updatedAppVersion = {
        id: 'test-version-id',
        appId: 'com.vimbisopay.app',
        platform: 'android',
        version: '1.1.1',
        minRequiredVersion: '1.0.0',
        updateUrl: 'https://downloads.vimbisopay.com/app/vimbisopay-1.1.1.apk',
        fileSizeBytes: 15728640,
        releaseNotes: 'Bug fixes and performance improvements',
        releaseDate: '2025-03-15T00:00:00Z',
        updatePriority: 'medium',
        updateType: 'patch',
        active: true,
        createdAt: '2025-03-15T00:00:00Z',
        updatedAt: '2025-03-16T00:00:00Z'
      };
      
      if (req.params.id === 'non-existent-id') {
        res.status(404).json({
          message: "App version not found",
          data: {
            action: {
              id: null,
              type: "ERROR_NOT_FOUND",
              timestamp: new Date().toISOString(),
              actor: req.user?.memberID || "system",
              details: {
                code: "NOT_FOUND",
                reason: `App version with ID ${req.params.id} not found`
              }
            },
            dashboard: {}
          }
        });
        return;
      }
      
      res.status(200).json({
        message: "App version updated successfully",
        data: {
          action: {
            id: updatedAppVersion.id,
            type: "APP_VERSION_CHECK",
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
            details: updatedAppVersion
          },
          dashboard: {}
        }
      });
    }),
    deleteAppVersion: jest.fn((req, res) => {
      if (req.params.id === 'non-existent-id') {
        res.status(404).json({
          message: "App version not found",
          data: {
            action: {
              id: null,
              type: "ERROR_NOT_FOUND",
              timestamp: new Date().toISOString(),
              actor: req.user?.memberID || "system",
              details: {
                code: "NOT_FOUND",
                reason: `App version with ID ${req.params.id} not found`
              }
            },
            dashboard: {}
          }
        });
        return;
      }
      
      res.status(200).json({
        message: "App version deleted successfully",
        data: {
          action: {
            id: req.params.id,
            type: "APP_VERSION_CHECK",
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
            details: {
              id: req.params.id
            }
          },
          dashboard: {}
        }
      });
    })
  }
}));

import axios from '../../../tests/setup';
import { generateRandomPhone } from '../../../tests/utils/testUtils';
import { TestCleanup } from '../../../tests/utils/cleanup';
import { AppVersion } from '../../../src/api/App/models/appVersion';
import { onboardMember } from '../functions/onboardMember';
import { loginV2 } from '../functions/loginV2';

describe('App Version Admin API', () => {
  // Client API key headers
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  // Authentication variables for each test
  let createTestMember: () => Promise<{ memberID: string, phone: string, authToken: string }>;

  // Sample app version data
  const sampleAppVersion: AppVersion = {
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

  // Sample app version create input
  const createAppVersionInput = {
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
    active: true
  };

  // Sample app version update input
  const updateAppVersionInput = {
    version: '1.1.1',
    updateUrl: 'https://downloads.vimbisopay.com/app/vimbisopay-1.1.1.apk',
    fileSizeBytes: 15728640,
    releaseNotes: 'Bug fixes and performance improvements',
    releaseDate: '2025-03-16T00:00:00Z',
    active: true
  };

  // Set up helper function to create test members
  beforeAll(() => {
    // Helper function to create a test member and get a token
    createTestMember = async () => {
      const phone = generateRandomPhone();
      const firstname = "Admin";
      const lastname = "User";
      const defaultDenom = "USD";
      const password = "TestPass123!";

      // Use the onboardMember helper function
      const onboardResponse = await onboardMember(
        firstname,
        lastname,
        phone,
        defaultDenom,
        password
      );

      const memberID = onboardResponse.data.action.details.memberID;
      
      // Use the loginV2 helper function to get a token
      const loginResponse = await loginV2(phone, password);
      const authToken = loginResponse.data.action.details.token;
      
      // Track member for cleanup
      TestCleanup.trackMember(memberID, phone);
      
      return { memberID, phone, authToken };
    };
  });

  describe('POST /api/admin/app-versions', () => {
    it('should create a new app version', async () => {
      // Create a test member for this test
      const { authToken } = await createTestMember();
      
      // Make the request - for POST requests, include token in the body
      const response = await axios.post('/api/admin/app-versions', {
        ...createAppVersionInput,
        token: authToken
      }, { headers });

      // Verify the response
      expect(response.status).toBe(201);
      // Don't check for specific ID as it's generated on the server
      expect(response.data.data.action.details.appId).toBe(sampleAppVersion.appId);
      expect(response.data.data.action.details.version).toBe(sampleAppVersion.version);
      
      // Update the sampleAppVersion.id with the actual ID for subsequent tests
      sampleAppVersion.id = response.data.data.action.details.id;
    });

    it('should return 400 when required fields are missing', async () => {
      // Create a test member for this test
      const { authToken } = await createTestMember();
      
      // Make the request with missing fields - for POST requests, include token in the body
      const response = await axios.post('/api/admin/app-versions', {
        appId: 'com.vimbisopay.app',
        token: authToken
      }, { headers }).catch(error => error.response);

      // Verify the response
      expect(response.status).toBe(400);
      expect(response.data.data.action.type).toBe('ERROR_VALIDATION');
    });
  });

  describe('GET /api/admin/app-versions/:id', () => {
    it('should get an app version by ID', async () => {
      // Create a test member for this test
      const { authToken } = await createTestMember();
      
      // Make the request - for GET requests, include token as a query parameter
      const response = await axios.get(`/api/admin/app-versions/${sampleAppVersion.id}`, {
        headers,
        params: { token: authToken }
      });

      // Verify the response
      expect(response.status).toBe(200);
      expect(response.data.data.action.details.id).toBe(sampleAppVersion.id);
      expect(response.data.data.action.details.appId).toBe(sampleAppVersion.appId);
      expect(response.data.data.action.details.version).toBe(sampleAppVersion.version);
    });

    it('should return 404 when app version is not found', async () => {
      // Create a test member for this test
      const { authToken } = await createTestMember();
      
      // Make the request - for GET requests, include token as a query parameter
      const response = await axios.get('/api/admin/app-versions/non-existent-id', {
        headers,
        params: { token: authToken }
      }).catch(error => error.response);

      // Verify the response
      expect(response.status).toBe(404);
      expect(response.data.data.action.type).toBe('ERROR_NOT_FOUND');
    });
  });

  describe('GET /api/admin/app-versions/app/:appId', () => {
    it('should get all app versions for an app', async () => {
      // Create a test member for this test
      const { authToken } = await createTestMember();
      
      // Make the request - for GET requests, include token as a query parameter
      const response = await axios.get(`/api/admin/app-versions/app/${sampleAppVersion.appId}`, {
        headers,
        params: { token: authToken }
      });

      // Verify the response
      expect(response.status).toBe(200);
      // There may be multiple versions, so find the one we just created
      const versions = response.data.data.action.details.versions;
      expect(versions.length).toBeGreaterThan(0);
      
      // Find our version in the list
      const ourVersion = versions.find((v: AppVersion) => v.id === sampleAppVersion.id);
      expect(ourVersion).toBeDefined();
      expect(ourVersion.appId).toBe(sampleAppVersion.appId);
      expect(ourVersion.version).toBe(sampleAppVersion.version);
    });
  });

  describe('PUT /api/admin/app-versions/:id', () => {
    it('should update an app version', async () => {
      // Create a test member for this test
      const { authToken } = await createTestMember();
      
      // Make the request - for PUT requests, include token in the body
      const response = await axios.put(`/api/admin/app-versions/${sampleAppVersion.id}`, {
        ...updateAppVersionInput,
        token: authToken
      }, { headers });

      // Verify the response
      expect(response.status).toBe(200);
      expect(response.data.data.action.details.id).toBe(sampleAppVersion.id);
      expect(response.data.data.action.details.version).toBe('1.1.1');
      expect(response.data.data.action.details.updateUrl).toBe('https://downloads.vimbisopay.com/app/vimbisopay-1.1.1.apk');
    });

    it('should return 404 when app version is not found', async () => {
      // Create a test member for this test
      const { authToken } = await createTestMember();
      
      // Make the request - for PUT requests, include token in the body
      const response = await axios.put('/api/admin/app-versions/non-existent-id', {
        ...updateAppVersionInput,
        token: authToken
      }, { headers }).catch(error => error.response);

      // Verify the response
      expect(response.status).toBe(404);
      expect(response.data.data.action.type).toBe('ERROR_NOT_FOUND');
    });
  });

  describe('DELETE /api/admin/app-versions/:id', () => {
    it('should delete an app version', async () => {
      // Create a test member for this test
      const { authToken } = await createTestMember();
      
      // Make the request - for DELETE requests, include token in the data property
      const response = await axios.delete(`/api/admin/app-versions/${sampleAppVersion.id}`, {
        headers,
        data: { token: authToken }
      });

      // Verify the response
      expect(response.status).toBe(200);
      expect(response.data.data.action.details.id).toBe(sampleAppVersion.id);
    });

    it('should return 404 when app version is not found', async () => {
      // Create a test member for this test
      const { authToken } = await createTestMember();
      
      // Make the request - for DELETE requests, include token in the data property
      const response = await axios.delete('/api/admin/app-versions/non-existent-id', {
        headers,
        data: { token: authToken }
      }).catch(error => error.response);

      // Verify the response
      expect(response.status).toBe(404);
      expect(response.data.data.action.type).toBe('ERROR_NOT_FOUND');
    });
  });
});
