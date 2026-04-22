import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/api_service.dart';
import 'core/socket_service.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  tz.initializeTimeZones();

  // Surface uncaught errors clearly in the browser console
  FlutterError.onError = (FlutterErrorDetails details) {
    if (kDebugMode) {
      FlutterError.dumpErrorToConsole(details);
    }
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    if (kDebugMode) {
      // ignore: avoid_print
      print('PlatformDispatcher uncaught: $error\n$stack');
    }
    return false; // let default handler also run
  };

  // Init services before the widget tree
  SharedPreferences prefs;
  try {
    prefs = await SharedPreferences.getInstance();
  } catch (e) {
    // Fallback: continue without persisted prefs
    if (kDebugMode) print('SharedPreferences init failed: $e');
    runApp(const ProviderScope(child: DedalApp()));
    return;
  }

  final token = prefs.getString('jwt_token');

  try {
    ApiService.instance.init();
  } catch (e) {
    if (kDebugMode) print('ApiService init error: $e');
  }

  try {
    SocketService.instance.init(token: token);
    SocketService.instance.connect();
  } catch (e) {
    if (kDebugMode) print('SocketService init error: $e');
    // App continues —  socket is nullable, providers handle absence gracefully
  }

  runApp(
    const ProviderScope(
      child: DedalApp(),
    ),
  );
}
