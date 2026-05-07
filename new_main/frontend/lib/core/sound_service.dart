import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

/// Lightweight singleton that plays move / capture sound effects.
///
/// Two separate [AudioPlayer] instances avoid conflicts when sounds
/// fire in quick succession (e.g. hero chain captures).
class SoundService {
  SoundService._();
  static final instance = SoundService._();

  final _movePlayer = AudioPlayer();
  final _capturePlayer = AudioPlayer();
  bool _initialized = false;

  /// Pre-set the sources so first playback is instant.
  Future<void> init() async {
    try {
      // Set player mode to low-latency for short sound effects
      await _movePlayer.setPlayerMode(PlayerMode.lowLatency);
      await _capturePlayer.setPlayerMode(PlayerMode.lowLatency);
      _initialized = true;
      debugPrint('[SoundService] initialized OK');
    } catch (e) {
      debugPrint('[SoundService] init error (non-fatal): $e');
    }
  }

  Future<void> playMove() async {
    debugPrint('[SoundService] playMove called (initialized=$_initialized)');
    try {
      await _movePlayer.stop();
      await _movePlayer.play(AssetSource('sounds/move.mp3'));
      debugPrint('[SoundService] playMove OK');
    } catch (e) {
      debugPrint('[SoundService] playMove error: $e');
    }
  }

  Future<void> playCapture() async {
    debugPrint('[SoundService] playCapture called (initialized=$_initialized)');
    try {
      await _capturePlayer.stop();
      await _capturePlayer.play(AssetSource('sounds/capture.mp3'));
      debugPrint('[SoundService] playCapture OK');
    } catch (e) {
      debugPrint('[SoundService] playCapture error: $e');
    }
  }
}
