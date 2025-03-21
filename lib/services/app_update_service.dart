import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:package_info/package_info.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:device_info_plus/device_info_plus.dart';

class AppUpdateService {
  final String baseUrl;
  final String clientApiKey;
  
  AppUpdateService({
    required this.baseUrl,
    required this.clientApiKey,
  });
  
  Future<Map<String, dynamic>?> checkForUpdate() async {
    try {
      // Get current app version
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;
      
      // Get device info
      final deviceInfo = await _getDeviceInfo();
      
      // Prepare request body
      final requestBody = {
        'app_id': packageInfo.packageName,
        'current_version': currentVersion,
        'device_info': deviceInfo,
        'user_info': {
          'user_id': await _getUserId(),
        }
      };
      
      // Make API request
      final response = await http.post(
        Uri.parse('$baseUrl/api/app/version-check'),
        headers: {
          'Content-Type': 'application/json',
          'x-client-api-key': clientApiKey
        },
        body: json.encode(requestBody),
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final actionDetails = data['data']['action']['details'];
        
        if (actionDetails['update_available'] == true) {
          return actionDetails;
        }
      }
      
      return null;
    } catch (e) {
      print('Error checking for update: $e');
      return null;
    }
  }
  
  Future<bool> showUpdateDialog(BuildContext context, Map<String, dynamic> updateInfo) async {
    final isRequired = updateInfo['update_required'] == true;
    
    return await showDialog<bool>(
      context: context,
      barrierDismissible: !isRequired,
      builder: (context) => AlertDialog(
        title: Text('Update Available'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('A new version (${updateInfo['latest_version']}) is available.'),
            SizedBox(height: 8),
            if (updateInfo['release_notes'] != null)
              Text(updateInfo['release_notes']),
            if (updateInfo['file_size_bytes'] != null)
              Text('Size: ${_formatFileSize(updateInfo['file_size_bytes'])}'),
          ],
        ),
        actions: [
          if (!isRequired)
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text('Later'),
            ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text('Update Now'),
          ),
        ],
      ),
    ) ?? false;
  }
  
  Future<void> downloadAndInstallUpdate(String updateUrl) async {
    if (await canLaunch(updateUrl)) {
      await launch(updateUrl);
    } else {
      throw Exception('Could not launch $updateUrl');
    }
  }
  
  // Helper methods
  Future<Map<String, dynamic>> _getDeviceInfo() async {
    final deviceInfoPlugin = DeviceInfoPlugin();
    
    try {
      if (Theme.of(NavigationService.navigatorKey.currentContext!).platform == TargetPlatform.android) {
        // Android device
        final androidInfo = await deviceInfoPlugin.androidInfo;
        return {
          'android_version': androidInfo.version.release,
          'device_model': androidInfo.model,
          'screen_size': '${androidInfo.displayMetrics.widthPx.toInt()}x${androidInfo.displayMetrics.heightPx.toInt()}'
        };
      } else {
        // iOS device
        final iosInfo = await deviceInfoPlugin.iosInfo;
        return {
          'ios_version': iosInfo.systemVersion,
          'device_model': iosInfo.model,
          'screen_size': '${iosInfo.utsname.machine}'
        };
      }
    } catch (e) {
      print('Error getting device info: $e');
      return {};
    }
  }
  
  Future<String?> _getUserId() async {
    // Get user ID from secure storage or authentication service
    // This is just a placeholder - implement according to your auth system
    try {
      // Example: Get from secure storage
      // final storage = FlutterSecureStorage();
      // return await storage.read(key: 'user_id');
      return 'user123'; // Placeholder
    } catch (e) {
      print('Error getting user ID: $e');
      return null;
    }
  }
  
  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }
}

// Example navigation service for accessing context
class NavigationService {
  static GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
}

// Example usage in main.dart:
/*
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize services
  final appUpdateService = AppUpdateService(
    baseUrl: 'https://api.vimbisopay.com',
    clientApiKey: 'your-client-api-key',
  );
  
  // Check for updates on app start
  final updateInfo = await appUpdateService.checkForUpdate();
  
  runApp(MyApp(
    appUpdateService: appUpdateService,
    initialUpdateInfo: updateInfo,
  ));
}

class MyApp extends StatelessWidget {
  final AppUpdateService appUpdateService;
  final Map<String, dynamic>? initialUpdateInfo;
  
  const MyApp({
    Key? key,
    required this.appUpdateService,
    this.initialUpdateInfo,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: NavigationService.navigatorKey,
      title: 'VimbisoPay',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: MyHomePage(
        appUpdateService: appUpdateService,
        initialUpdateInfo: initialUpdateInfo,
      ),
    );
  }
}

class MyHomePage extends StatefulWidget {
  final AppUpdateService appUpdateService;
  final Map<String, dynamic>? initialUpdateInfo;
  
  const MyHomePage({
    Key? key,
    required this.appUpdateService,
    this.initialUpdateInfo,
  }) : super(key: key);
  
  @override
  _MyHomePageState createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  @override
  void initState() {
    super.initState();
    
    // Check for updates
    if (widget.initialUpdateInfo != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _handleUpdateInfo(widget.initialUpdateInfo!);
      });
    }
  }
  
  Future<void> _handleUpdateInfo(Map<String, dynamic> updateInfo) async {
    final shouldUpdate = await widget.appUpdateService.showUpdateDialog(context, updateInfo);
    if (shouldUpdate) {
      await widget.appUpdateService.downloadAndInstallUpdate(updateInfo['update_url']);
    }
  }
  
  Future<void> _checkForUpdates() async {
    final updateInfo = await widget.appUpdateService.checkForUpdate();
    if (updateInfo != null) {
      await _handleUpdateInfo(updateInfo);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No updates available')),
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('VimbisoPay'),
        actions: [
          IconButton(
            icon: Icon(Icons.system_update),
            onPressed: _checkForUpdates,
            tooltip: 'Check for updates',
          ),
        ],
      ),
      body: Center(
        child: Text('Welcome to VimbisoPay'),
      ),
    );
  }
}
*/
