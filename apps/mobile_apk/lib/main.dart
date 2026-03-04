import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:battery_plus/battery_plus.dart';

const String _supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const String _supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final hasConfig = _supabaseUrl.isNotEmpty && _supabaseAnonKey.isNotEmpty;

  if (hasConfig) {
    await Supabase.initialize(url: _supabaseUrl, anonKey: _supabaseAnonKey);
  }

  runApp(MobileApkApp(hasConfig: hasConfig));
}

class MobileApkApp extends StatelessWidget {
  final bool hasConfig;

  const MobileApkApp({super.key, required this.hasConfig});

  @override
  Widget build(BuildContext context) {
    const seedColor = Color(0xFF0E6BA8);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Epsilon Data Collector',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: seedColor,
          brightness: Brightness.light,
        ),
        textTheme: GoogleFonts.spaceGroteskTextTheme(),
      ),
      home: hasConfig ? const MainLayout() : const MissingConfigPage(),
    );
  }
}

class MissingConfigPage extends StatelessWidget {
  const MissingConfigPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.red.shade50,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.error_outline, size: 80, color: Colors.red),
              const SizedBox(height: 24),
              const Text(
                'Configuration Missing',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.red,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'The app was launched without Supabase credentials. This prevents the app from working correctly.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 32),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'How to fix:',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Stop the current run and launch the app using this command in your terminal:',
                      style: TextStyle(fontSize: 14),
                    ),
                    SizedBox(height: 12),
                    Text(
                      'flutter run --dart-define-from-file=dart_defines.json',
                      style: TextStyle(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                        color: Colors.blueAccent,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class MainLayout extends StatefulWidget {
  const MainLayout({super.key});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    MobileLivePage(),
    FillTriggerPage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.device_hub_outlined),
            selectedIcon: Icon(Icons.device_hub),
            label: 'Device Logger',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Trigger Settings',
          ),
        ],
      ),
    );
  }
}

class MobileLivePage extends StatefulWidget {
  const MobileLivePage({super.key});

  @override
  State<MobileLivePage> createState() => _MobileLivePageState();
}

class _MobileLivePageState extends State<MobileLivePage> {
  static const String _deviceIdStorageKey = 'device_id_string';
  static const String _thresholdKey = 'battery_threshold_percent';

  final TextEditingController _deviceIdController = TextEditingController();
  final Battery _battery = Battery();
  
  Timer? _syncTimer;
  bool _isLoadingStoredDevice = true;
  String? _deviceId;
  int? _currentBattery;
  String? _lastSyncMessage;
  bool _lastSyncSuccess = false;
  bool _isAutoSyncing = false;
  
  // Track if we already triggered the low battery alert so we don't spam it every 10 seconds
  bool _hasTriggeredForCurrentDip = false;

  @override
  void initState() {
    super.initState();
    _loadStoredDeviceId();
  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    _deviceIdController.dispose();
    super.dispose();
  }

  Future<void> _loadStoredDeviceId() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final storedId = prefs.getString(_deviceIdStorageKey);

      if (!mounted) return;

      setState(() {
        _deviceId = storedId;
        if (storedId != null) {
          _deviceIdController.text = storedId;
          _startAutoSync();
        }
      });
    } finally {
      if (mounted) {
        setState(() => _isLoadingStoredDevice = false);
      }
    }
  }

  void _startAutoSync() {
    _syncTimer?.cancel();
    // Run an initial sync immediately
    _pushLiveData();
    // Then run every 10 seconds
    _syncTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _pushLiveData();
    });
    setState(() => _isAutoSyncing = true);
  }

  void _stopAutoSync() {
    _syncTimer?.cancel();
    setState(() => _isAutoSyncing = false);
  }

  Future<void> _saveDeviceId() async {
    final newId = _deviceIdController.text.trim();
    if (newId.isEmpty) {
      _showToast('Enter a valid device ID.');
      return;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_deviceIdStorageKey, newId);

      if (!mounted) return;

      setState(() {
        _deviceId = newId;
        _lastSyncMessage = null;
        _hasTriggeredForCurrentDip = false; // Reset trigger state for new device
      });

      _startAutoSync();
      _showToast('Device ID saved and Auto-Sync started.');
    } catch (error) {
      _showToast('Could not save device ID: $error');
    }
  }

  Future<void> _changeDeviceId() async {
    _stopAutoSync();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_deviceIdStorageKey);
    } catch (_) {}

    if (!mounted) return;

    setState(() {
      _deviceId = null;
      _deviceIdController.clear();
      _lastSyncMessage = null;
    });
  }

  Future<void> _pushLiveData() async {
    final activeDeviceId = _deviceId;
    if (activeDeviceId == null) return;

    try {
      final nowUtc = DateTime.now().toUtc().toIso8601String();
      final batteryLevel = await _battery.batteryLevel;
      
      setState(() {
        _currentBattery = batteryLevel;
      });

      // 1. Always update device_status with current real battery level
      await Supabase.instance.client
          .from('device_status')
          .upsert({
            'device_id': activeDeviceId,
            'status': 'online',
            'battery_level': batteryLevel,
            'last_sync': nowUtc,
            'last_log_received': nowUtc,
            'error_message': null,
          }, onConflict: 'device_id');

      // 2. Check if we need to fire a Fill Trigger Event based on real battery hitting threshold
      final prefs = await SharedPreferences.getInstance();
      final threshold = prefs.getDouble(_thresholdKey) ?? 25.0;

      if (batteryLevel <= threshold) {
        // Only trigger once per dip. It will reset if they change device ID or restart app for now.
        // In a complex app, you'd reset this flag when battery goes back ABOVE threshold.
        if (!_hasTriggeredForCurrentDip) {
          await Supabase.instance.client.from('feature_fill_trigger_events').insert({
            'device_id': activeDeviceId,
            'fill_percent': batteryLevel,
            'threshold_percent': threshold,
            'background_color': 'red', 
            'device_type': 'mobile',
            'triggered_at': nowUtc,
          });
          _hasTriggeredForCurrentDip = true;
          _showToast('⚠️ Battery reached threshold ($batteryLevel%). Trigger event sent!');
        }
      } else {
        // Reset flag if battery charges back up above threshold
        _hasTriggeredForCurrentDip = false;
      }

      if (!mounted) return;

      setState(() {
        _lastSyncSuccess = true;
        _lastSyncMessage = 'Last sync at ${_formatTime(DateTime.now())} (Battery: $batteryLevel%)';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _lastSyncSuccess = false;
        _lastSyncMessage = 'Error syncing: $error';
      });
    }
  }

  void _showToast(String message) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Live Battery Monitor')),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFF7FAFF), Color(0xFFEAF3FB)],
          ),
        ),
        child: SafeArea(
          child: _isLoadingStoredDevice
              ? const Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      if (_deviceId == null) _buildSetupCard(),
                      if (_deviceId != null) _buildSyncCard(),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildSetupCard() {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Set Device Identity',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            const Text('Enter the ID to start monitoring your physical battery.'),
            const SizedBox(height: 14),
            TextField(
              controller: _deviceIdController,
              decoration: const InputDecoration(
                labelText: 'Device ID',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _saveDeviceId,
                icon: const Icon(Icons.save_outlined),
                label: const Text('Save & Start Syncing'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSyncCard() {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '$_deviceId',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Icon(
                  _isAutoSyncing ? Icons.sensors : Icons.sensors_off, 
                  color: _isAutoSyncing ? Colors.green : Colors.grey
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('Auto-syncing battery level every 10s...'),
            const SizedBox(height: 14),
            if (_currentBattery != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.blue.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _currentBattery! > 20 ? Icons.battery_full : Icons.battery_alert, 
                      size: 40,
                      color: _currentBattery! > 20 ? Colors.green : Colors.red,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      '$_currentBattery%',
                      style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            if (_lastSyncMessage != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _lastSyncSuccess
                      ? Colors.green.withOpacity(0.1)
                      : Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: _lastSyncSuccess
                        ? Colors.green.withOpacity(0.3)
                        : Colors.red.withOpacity(0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _lastSyncSuccess ? Icons.check_circle : Icons.error,
                      color: _lastSyncSuccess ? Colors.green : Colors.red,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _lastSyncMessage!,
                        style: TextStyle(
                          color: _lastSyncSuccess
                              ? Colors.green.shade900
                              : Colors.red.shade900,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _changeDeviceId,
                icon: const Icon(Icons.edit_outlined),
                label: const Text('Change ID & Stop Sync'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime time) {
    return '${time.hour.toString().padLeft(2, '0')}:'
        '${time.minute.toString().padLeft(2, '0')}:'
        '${time.second.toString().padLeft(2, '0')}';
  }
}

class FillTriggerPage extends StatefulWidget {
  const FillTriggerPage({super.key});

  @override
  State<FillTriggerPage> createState() => _FillTriggerPageState();
}

class _FillTriggerPageState extends State<FillTriggerPage> {
  static const String _thresholdKey = 'battery_threshold_percent';
  static const String _deviceIdStorageKey = 'device_id_string';
  
  double _thresholdPercent = 25.0;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadThreshold();
  }

  Future<void> _loadThreshold() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _thresholdPercent = prefs.getDouble(_thresholdKey) ?? 25.0;
    });
  }

  Future<void> _saveThreshold() async {
    if (_isSaving) return;
    setState(() => _isSaving = true);

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setDouble(_thresholdKey, _thresholdPercent);
      
      final activeDeviceId = prefs.getString(_deviceIdStorageKey);
      
      // Save it to Supabase settings if a device ID exists
      if (activeDeviceId != null) {
        await Supabase.instance.client.from('feature_fill_trigger_settings').upsert({
          'device_id': activeDeviceId,
          'threshold_percent': _thresholdPercent,
        });
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Threshold saved: ${_thresholdPercent.toStringAsFixed(0)}%')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error saving: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Trigger Settings')),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFF7FAFF), Color(0xFFEAF3FB)],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.bolt, size: 80, color: Colors.orange),
                const SizedBox(height: 24),
                const Text(
                  'Set Alert Threshold',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                const Text(
                  'The app will automatically send an event to the cloud when your actual battery drops below this percentage.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 32),
                Text(
                  '${_thresholdPercent.toStringAsFixed(0)}%',
                  style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Colors.orange),
                ),
                const SizedBox(height: 32),
                Slider(
                  value: _thresholdPercent,
                  min: 5,
                  max: 100,
                  divisions: 95,
                  activeColor: Colors.orange,
                  label: '${_thresholdPercent.toStringAsFixed(0)}%',
                  onChanged: (value) {
                    setState(() {
                      _thresholdPercent = value;
                    });
                  },
                ),
                const SizedBox(height: 48),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: Colors.orange),
                    onPressed: _isSaving ? null : _saveThreshold,
                    icon: _isSaving ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(Icons.save),
                    label: Text(_isSaving ? 'Saving...' : 'Save Threshold'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
