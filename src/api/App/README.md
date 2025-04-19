# App Updates API

This module provides API endpoints for checking app updates and managing app versions. It allows mobile apps to check if a new version is available and get information about the update, and provides admin endpoints for managing app versions.

## Client API Endpoints

### Check for App Updates

**Endpoint:** `/api/app/version-check`

**Method:** POST

**Authentication:** Client API Key (`x-client-api-key` header)

**Description:** Checks if an update is available for the app based on the current version.

**Request Body:**

```json
{
  "app_id": "com.vimbisopay.app",
  "current_version": "1.0.0",
  "device_info": {
    "android_version": "12",
    "device_model": "Pixel 6",
    "screen_size": "1080x2400"
  },
  "user_info": {
    "user_id": "user123"
  }
}
```

**Response (Update Available):**

```json
{
  "message": "Update available",
  "data": {
    "action": {
      "id": "com.vimbisopay.app",
      "type": "APP_VERSION_CHECK",
      "timestamp": "2025-03-20T18:30:00.000Z",
      "actor": "system",
      "details": {
        "update_available": true,
        "latest_version": "1.1.0",
        "update_required": false,
        "update_priority": "medium",
        "update_type": "patch",
        "update_url": "https://downloads.vimbisopay.com/app/vimbisopay-1.1.0.apk",
        "file_size_bytes": 15728640,
        "release_notes": "Bug fixes and performance improvements",
        "release_date": "2025-03-15T00:00:00Z"
      }
    },
    "dashboard": {}
  }
}
```

**Response (No Update Available):**

```json
{
  "message": "No updates available",
  "data": {
    "action": {
      "id": "com.vimbisopay.app",
      "type": "APP_VERSION_CHECK",
      "timestamp": "2025-03-20T18:30:00.000Z",
      "actor": "system",
      "details": {
        "update_available": false
      }
    },
    "dashboard": {}
  }
}
```

**Response (Update Required):**

```json
{
  "message": "Update required",
  "data": {
    "action": {
      "id": "com.vimbisopay.app",
      "type": "APP_VERSION_CHECK",
      "timestamp": "2025-03-20T18:30:00.000Z",
      "actor": "system",
      "details": {
        "update_available": true,
        "latest_version": "2.0.0",
        "update_required": true,
        "update_priority": "critical",
        "update_type": "major",
        "update_url": "https://downloads.vimbisopay.com/app/vimbisopay-2.0.0.apk",
        "file_size_bytes": 20971520,
        "release_notes": "Major update with new features and security improvements",
        "release_date": "2025-03-15T00:00:00Z"
      }
    },
    "dashboard": {}
  }
}
```

### Test App Update Check

**Endpoint:** `/api/app/version-check/test`

**Method:** POST

**Authentication:** Client API Key (`x-client-api-key` header)

**Description:** Test endpoint that always returns an update is available. Useful for testing the update flow in the app.

**Request Body:**

```json
{
  "app_id": "com.vimbisopay.app",
  "current_version": "1.0.0"
}
```

**Response:**

```json
{
  "message": "Update available",
  "data": {
    "action": {
      "id": "com.vimbisopay.app",
      "type": "APP_VERSION_CHECK",
      "timestamp": "2025-03-20T18:30:00.000Z",
      "actor": "system",
      "details": {
        "update_available": true,
        "latest_version": "1.1.0",
        "update_required": false,
        "update_priority": "medium",
        "update_type": "patch",
        "update_url": "https://downloads.vimbisopay.com/app/vimbisopay-1.1.0.apk",
        "file_size_bytes": 15728640,
        "release_notes": "Bug fixes and performance improvements",
        "release_date": "2025-03-15T00:00:00Z"
      }
    },
    "dashboard": {}
  }
}
```

## Admin API Endpoints

The admin API provides endpoints for managing app versions. These endpoints require authentication using a JWT bearer token.

### Create App Version

**Endpoint:** `/api/admin/app-versions`

**Method:** POST

**Authentication:** Bearer Token

**Description:** Creates a new app version. When a new version is created with `active: true`, all other versions for the same app and platform are automatically set to inactive.

**Request Body:**

```json
{
  "appId": "com.vimbisopay.app",
  "platform": "android",
  "version": "1.1.0",
  "minRequiredVersion": "1.0.0",
  "updateUrl": "https://downloads.vimbisopay.com/app/vimbisopay-1.1.0.apk",
  "fileSizeBytes": 15728640,
  "releaseNotes": "Bug fixes and performance improvements",
  "releaseDate": "2025-03-15T00:00:00Z",
  "updatePriority": "medium",
  "updateType": "patch",
  "active": true
}
```

**Response:**

```json
{
  "message": "App version created successfully",
  "data": {
    "action": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "type": "APP_VERSION_CHECK",
      "timestamp": "2025-03-20T18:30:00.000Z",
      "actor": "admin-user-id",
      "details": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "appId": "com.vimbisopay.app",
        "platform": "android",
        "version": "1.1.0",
        "minRequiredVersion": "1.0.0",
        "updateUrl": "https://downloads.vimbisopay.com/app/vimbisopay-1.1.0.apk",
        "fileSizeBytes": 15728640,
        "releaseNotes": "Bug fixes and performance improvements",
        "releaseDate": "2025-03-15T00:00:00Z",
        "updatePriority": "medium",
        "updateType": "patch",
        "active": true,
        "createdAt": "2025-03-20T18:30:00.000Z",
        "updatedAt": "2025-03-20T18:30:00.000Z"
      }
    },
    "dashboard": {}
  }
}
```

### Get App Version

**Endpoint:** `/api/admin/app-versions/:id`

**Method:** GET

**Authentication:** Bearer Token

**Description:** Gets an app version by ID.

**Response:**

```json
{
  "message": "App version found",
  "data": {
    "action": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "type": "APP_VERSION_CHECK",
      "timestamp": "2025-03-20T18:30:00.000Z",
      "actor": "admin-user-id",
      "details": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "appId": "com.vimbisopay.app",
        "platform": "android",
        "version": "1.1.0",
        "minRequiredVersion": "1.0.0",
        "updateUrl": "https://downloads.vimbisopay.com/app/vimbisopay-1.1.0.apk",
        "fileSizeBytes": 15728640,
        "releaseNotes": "Bug fixes and performance improvements",
        "releaseDate": "2025-03-15T00:00:00Z",
        "updatePriority": "medium",
        "updateType": "patch",
        "active": true,
        "createdAt": "2025-03-20T18:30:00.000Z",
        "updatedAt": "2025-03-20T18:30:00.000Z"
      }
    },
    "dashboard": {}
  }
}
```

### Get App Versions

**Endpoint:** `/api/admin/app-versions/app/:appId`

**Method:** GET

**Authentication:** Bearer Token

**Description:** Gets all app versions for an app, ordered by platform and creation date (descending).

**Response:**

```json
{
  "message": "App versions found",
  "data": {
    "action": {
      "id": "com.vimbisopay.app",
      "type": "APP_VERSION_CHECK",
      "timestamp": "2025-03-20T18:30:00.000Z",
      "actor": "admin-user-id",
      "details": {
        "versions": [
          {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "appId": "com.vimbisopay.app",
            "platform": "android",
            "version": "1.1.0",
            "minRequiredVersion": "1.0.0",
            "updateUrl": "https://downloads.vimbisopay.com/app/vimbisopay-1.1.0.apk",
            "fileSizeBytes": 15728640,
            "releaseNotes": "Bug fixes and performance improvements",
            "releaseDate": "2025-03-15T00:00:00Z",
            "updatePriority": "medium",
            "updateType": "patch",
            "active": true,
            "createdAt": "2025-03-20T18:30:00.000Z",
            "updatedAt": "2025-03-20T18:30:00.000Z"
          },
          {
            "id": "223e4567-e89b-12d3-a456-426614174000",
            "appId": "com.vimbisopay.app",
            "platform": "ios",
            "version": "1.1.0",
            "minRequiredVersion": "1.0.0",
            "updateUrl": "https://apps.apple.com/app/vimbisopay/id123456789",
            "fileSizeBytes": 15728640,
            "releaseNotes": "Bug fixes and performance improvements",
            "releaseDate": "2025-03-15T00:00:00Z",
            "updatePriority": "medium",
            "updateType": "patch",
            "active": true,
            "createdAt": "2025-03-20T18:30:00.000Z",
            "updatedAt": "2025-03-20T18:30:00.000Z"
          }
        ]
      }
    },
    "dashboard": {}
  }
}
```

### Update App Version

**Endpoint:** `/api/admin/app-versions/:id`

**Method:** PUT

**Authentication:** Bearer Token

**Description:** Updates an app version. When a version is updated with `active: true`, all other versions for the same app and platform are automatically set to inactive.

**Request Body:**

```json
{
  "version": "1.1.1",
  "updateUrl": "https://downloads.vimbisopay.com/app/vimbisopay-1.1.1.apk",
  "fileSizeBytes": 15728640,
  "releaseNotes": "Bug fixes and performance improvements",
  "active": true
}
```

**Response:**

```json
{
  "message": "App version updated successfully",
  "data": {
    "action": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "type": "APP_VERSION_CHECK",
      "timestamp": "2025-03-20T18:30:00.000Z",
      "actor": "admin-user-id",
      "details": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "appId": "com.vimbisopay.app",
        "platform": "android",
        "version": "1.1.1",
        "minRequiredVersion": "1.0.0",
        "updateUrl": "https://downloads.vimbisopay.com/app/vimbisopay-1.1.1.apk",
        "fileSizeBytes": 15728640,
        "releaseNotes": "Bug fixes and performance improvements",
        "releaseDate": "2025-03-15T00:00:00Z",
        "updatePriority": "medium",
        "updateType": "patch",
        "active": true,
        "createdAt": "2025-03-20T18:30:00.000Z",
        "updatedAt": "2025-03-20T18:35:00.000Z"
      }
    },
    "dashboard": {}
  }
}
```

### Delete App Version

**Endpoint:** `/api/admin/app-versions/:id`

**Method:** DELETE

**Authentication:** Bearer Token

**Description:** Deletes an app version.

**Response:**

```json
{
  "message": "App version deleted successfully",
  "data": {
    "action": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "type": "APP_VERSION_CHECK",
      "timestamp": "2025-03-20T18:30:00.000Z",
      "actor": "admin-user-id",
      "details": {
        "id": "123e4567-e89b-12d3-a456-426614174000"
      }
    },
    "dashboard": {}
  }
}
```

## App Version Model

The app version data is stored in the database with the following structure:

### AppVersion

```typescript
interface AppVersion {
  id: string;                                      // Unique identifier for the app version
  appId: string;                                   // App ID (e.g., com.vimbisopay.app)
  platform: 'android' | 'ios';                     // Platform (android or ios)
  version: string;                                 // Version (e.g., 1.0.0 or 1.0.0+33)
  minRequiredVersion: string;                      // Minimum required version (e.g., 1.0.0)
  updateUrl: string;                               // URL to download the update
  fileSizeBytes: number;                           // Size of the update file in bytes
  releaseNotes: string;                            // Notes about the update
  releaseDate: string;                             // Date the update was released (ISO 8601)
  updatePriority: 'low' | 'medium' | 'high' | 'critical'; // Priority of the update
  updateType: 'patch' | 'minor' | 'major';         // Type of update
  active: boolean;                                 // Whether the version is active
  createdAt: string;                               // Date the version was created
  updatedAt: string;                               // Date the version was last updated
}
```

### AppVersionCreateInput

```typescript
interface AppVersionCreateInput {
  appId: string;                                   // App ID (e.g., com.vimbisopay.app)
  platform: 'android' | 'ios';                     // Platform (android or ios)
  version: string;                                 // Version (e.g., 1.0.0 or 1.0.0+33)
  minRequiredVersion: string;                      // Minimum required version (e.g., 1.0.0)
  updateUrl: string;                               // URL to download the update
  fileSizeBytes: number;                           // Size of the update file in bytes
  releaseNotes: string;                            // Notes about the update
  releaseDate: string;                             // Date the update was released (ISO 8601)
  updatePriority: 'low' | 'medium' | 'high' | 'critical'; // Priority of the update
  updateType: 'patch' | 'minor' | 'major';         // Type of update
  active?: boolean;                                // Whether the version is active (default: true)
}
```

### AppVersionUpdateInput

```typescript
interface AppVersionUpdateInput {
  version?: string;                                // Version (e.g., 1.0.0 or 1.0.0+33)
  minRequiredVersion?: string;                     // Minimum required version (e.g., 1.0.0)
  updateUrl?: string;                              // URL to download the update
  fileSizeBytes?: number;                          // Size of the update file in bytes
  releaseNotes?: string;                           // Notes about the update
  releaseDate?: string;                            // Date the update was released (ISO 8601)
  updatePriority?: 'low' | 'medium' | 'high' | 'critical'; // Priority of the update
  updateType?: 'patch' | 'minor' | 'major';        // Type of update
  active?: boolean;                                // Whether the version is active
}
```

### AppVersionResponse

```typescript
interface AppVersionResponse {
  update_available: boolean;                       // Whether an update is available
  latest_version?: string;                         // The latest version of the app
  update_required?: boolean;                       // Whether the update is required
  update_priority?: 'low' | 'medium' | 'high' | 'critical'; // Priority of the update
  update_type?: 'patch' | 'minor' | 'major';       // Type of update
  update_url?: string;                             // URL to download the update
  file_size_bytes?: number;                        // Size of the update file in bytes
  release_notes?: string;                          // Notes about the update
  release_date?: string;                           // Date the update was released (ISO 8601)
}
```

## Version Comparison Logic

The API compares versions using semantic versioning (major.minor.patch) and also supports build numbers (e.g., 1.0.0+33). The comparison logic is as follows:

1. Split the version string into semantic version and build number (if present)
2. Compare major, minor, and patch versions numerically
3. If semantic versions are equal, compare build numbers numerically
4. If one version has a build number and the other doesn't, the one with a build number is considered newer

Example comparisons:
- "1.0.0" < "1.0.1" (patch version is higher)
- "1.0.0" < "1.1.0" (minor version is higher)
- "1.0.0" < "2.0.0" (major version is higher)
- "1.0.0" < "1.0.0+1" (same semantic version, but second has a build number)
- "1.0.0+1" < "1.0.0+2" (same semantic version, but second has a higher build number)
- "1.0.1" > "1.0.0+999" (patch version takes precedence over build number)

## Caching Mechanism

To improve performance and reduce database load, the app version data is cached in memory using `node-cache`. The cache has the following characteristics:

- **TTL (Time-to-Live)**: 300 seconds (5 minutes)
- **Check Period**: 60 seconds (cache cleanup interval)
- **Cache Key**: `${app_id}:${platform}` (e.g., "com.vimbisopay.app:android")

The caching logic works as follows:

1. When a client requests a version check, the service first checks the cache for the app version
2. If the version is found in the cache, it's used directly without querying the database
3. If the version is not in the cache, it's fetched from the database and then stored in the cache
4. The cache automatically expires entries after 5 minutes, ensuring that clients get updated information

This caching mechanism significantly reduces database load for frequently accessed app versions while ensuring that clients get updated information within a reasonable timeframe.

## Active Version Management

The system ensures that only one version per app and platform is active at any given time. This is enforced through the following mechanisms:

1. **Creating a new version**: When a new version is created with `active: true`, all other versions for the same app and platform are automatically set to inactive.
2. **Updating a version**: When a version is updated with `active: true`, all other versions for the same app and platform are automatically set to inactive.

This ensures that the version check endpoint always returns the correct latest version for each app and platform.

## Client Implementation

A sample client implementation is provided in `lib/services/app_update_service.dart`. This implementation shows how to:

1. Check for updates
2. Show an update dialog
3. Download and install updates

### Usage

```dart
// Initialize the service
final appUpdateService = AppUpdateService(
  baseUrl: 'https://api.vimbisopay.com',
  clientApiKey: 'your-client-api-key',
);

// Check for updates
final updateInfo = await appUpdateService.checkForUpdate();
if (updateInfo != null) {
  // Show update dialog
  final shouldUpdate = await appUpdateService.showUpdateDialog(context, updateInfo);
  if (shouldUpdate) {
    // Download and install update
    await appUpdateService.downloadAndInstallUpdate(updateInfo['update_url']);
  }
}
```

## Testing

Tests for the API endpoints are provided in `tests/api/App/appVersion.test.ts` and `tests/api/App/appVersionAdmin.test.ts`. These tests cover:

1. Checking for updates when the current version is the latest
2. Checking for updates when the current version is older
3. Checking for updates when the current version is below the minimum required version
4. Validation of request parameters
5. Testing the test endpoint
6. Creating, retrieving, updating, and deleting app versions through the admin API
7. Active version management
