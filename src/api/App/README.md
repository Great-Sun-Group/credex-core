# App Updates API

This module provides API endpoints for checking app updates. It allows mobile apps to check if a new version is available and get information about the update.

## Endpoints

### Check for App Updates

**Endpoint:** `/api/app/version-check`

**Method:** POST

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

### Test App Update Check

**Endpoint:** `/api/app/version-check/test`

**Method:** POST

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

## Version Comparison Logic

The API compares versions using semantic versioning (major.minor.patch) and also supports build numbers (e.g., 1.0.0+33). The comparison logic is as follows:

1. Compare major, minor, and patch versions
2. If semantic versions are equal, compare build numbers
3. If one version has a build number and the other doesn't, the one with a build number is considered newer

## Configuration

App version information is stored in the database using Neo4j. The app version data is stored in `AppVersion` nodes with the following properties:

- `id`: Unique identifier for the app version
- `appId`: App ID (e.g., com.vimbisopay.app)
- `platform`: Platform (android or ios)
- `version`: Version (e.g., 1.0.0 or 1.0.0+33)
- `minRequiredVersion`: Minimum required version (e.g., 1.0.0 or 1.0.0+33)
- `updateUrl`: URL to download the update
- `fileSizeBytes`: Size of the update file in bytes
- `releaseNotes`: Notes about the update
- `releaseDate`: Date the update was released (ISO 8601 format)
- `updatePriority`: Priority of the update (low, medium, high, critical)
- `updateType`: Type of update (patch, minor, major)
- `active`: Whether the version is active
- `createdAt`: Date the version was created
- `updatedAt`: Date the version was last updated

The app version data is cached in memory for 5 minutes to improve performance.

## Admin API

The admin API provides endpoints for managing app versions:

### Create App Version

**Endpoint:** `/api/admin/app-versions`

**Method:** POST

**Description:** Creates a new app version.

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

### Get App Version

**Endpoint:** `/api/admin/app-versions/:id`

**Method:** GET

**Description:** Gets an app version by ID.

### Get App Versions

**Endpoint:** `/api/admin/app-versions/app/:appId`

**Method:** GET

**Description:** Gets all app versions for an app.

### Update App Version

**Endpoint:** `/api/admin/app-versions/:id`

**Method:** PUT

**Description:** Updates an app version.

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

### Delete App Version

**Endpoint:** `/api/admin/app-versions/:id`

**Method:** DELETE

**Description:** Deletes an app version.

## Testing

Tests for the API endpoints are provided in `tests/api/App/appVersion.test.ts`. These tests cover:

1. Checking for updates when the current version is the latest
2. Checking for updates when the current version is older
3. Checking for updates when the current version is below the minimum required version
4. Validation of request parameters
5. Testing the test endpoint
