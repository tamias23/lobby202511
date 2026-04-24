import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest_all.dart' as tz_data;
import '../../core/socket_service.dart';
import '../../core/theme.dart';
import '../../widgets/glass_panel.dart';
import '../../providers/auth_provider.dart';

// ── Helpers ───────────────────────────────────────────────────────────────────

String _fmtTs(dynamic ts) {
  if (ts == null || ts == 0) return '—';
  try {
    final dt = DateTime.fromMillisecondsSinceEpoch((ts as num).toInt(), isUtc: true);
    return '${dt.year}-${dt.month.toString().padLeft(2,'0')}-${dt.day.toString().padLeft(2,'0')} '
           '${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')} UTC';
  } catch (_) {
    return '?';
  }
}

String _cronLabel(Map<String,dynamic> job) {
  final min = job['minute']?.toString() ?? '*';
  final hr  = job['hour']?.toString()   ?? '*';
  final wd  = job['weekday']?.toString() ?? '*';
  return '$min $hr $wd';
}

String _cronHuman(Map<String,dynamic> job) {
  final min = job['minute']?.toString() ?? '*';
  final hr  = job['hour']?.toString()   ?? '*';
  final wd  = job['weekday']?.toString() ?? '*';

  // Step syntax: */N
  if (min.startsWith('*/')) {
    final step = min.substring(2);
    return 'every ${step}min';
  }

  String time;
  if (min == '*' && hr == '*') {
    time = 'every minute';
  } else if (min == '*') {
    time = 'every hour';
  } else if (hr == '*') {
    time = 'every hour at :${min.padLeft(2, '0')}';
  } else {
    time = '${hr.padLeft(2, '0')}:${min.padLeft(2, '0')} UTC';
  }

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  String day;
  if (wd == '*') {
    day = 'daily';
  } else {
    final idx = int.tryParse(wd);
    day = 'on ${(idx != null && idx < days.length) ? days[idx] : wd}';
  }

  return '$time $day';
}

Color _statusColor(String? status) {
  return switch (status) {
    'DONE'    => DTheme.success,
    'FAILED'  => Colors.red,
    'RUNNING' => Colors.blue,
    _         => Colors.orange,
  };
}

// ── Double Clock ─────────────────────────────────────────────────────────────

class _DoubleClock extends StatefulWidget {
  final String userTimezone;
  const _DoubleClock({required this.userTimezone});
  @override
  State<_DoubleClock> createState() => _DoubleClockState();
}

class _DoubleClockState extends State<_DoubleClock> {
  late Timer _timer;
  DateTime _now = DateTime.now().toUtc();

  @override
  void initState() {
    super.initState();
    tz_data.initializeTimeZones();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now().toUtc());
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String _fmt(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    final s = dt.second.toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    // UTC
    final utcStr = _fmt(_now);

    // User's timezone
    String localStr = utcStr;
    String tzLabel  = widget.userTimezone;
    try {
      final loc   = tz.getLocation(widget.userTimezone);
      final local = tz.TZDateTime.from(_now, loc);
      localStr = _fmt(local);
      // Abbreviate long names like 'Europe/Paris' → 'Paris'
      final parts = widget.userTimezone.split('/');
      tzLabel = parts.last.replaceAll('_', ' ');
    } catch (_) {}

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _ClockBadge(label: 'UTC',    time: utcStr,   color: Colors.white54),
        const SizedBox(width: 8),
        _ClockBadge(label: tzLabel, time: localStr, color: DTheme.primary),
      ],
    );
  }
}

class _ClockBadge extends StatelessWidget {
  final String label;
  final String time;
  final Color  color;
  const _ClockBadge({required this.label, required this.time, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.30)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label,
              style: GoogleFonts.outfit(
                  color: color, fontSize: 9, fontWeight: FontWeight.w600,
                  letterSpacing: 0.8)),
          Text(time,
              style: const TextStyle(
                  fontFamily: 'monospace', fontSize: 13,
                  color: Colors.white, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────

class AdminJobsScreen extends ConsumerStatefulWidget {
  const AdminJobsScreen({super.key});
  @override
  ConsumerState<AdminJobsScreen> createState() => _AdminJobsScreenState();
}

class _AdminJobsScreenState extends ConsumerState<AdminJobsScreen>
    with SingleTickerProviderStateMixin {
  final _socket = SocketService.instance;
  List<Map<String,dynamic>> _cronJobs  = [];
  List<Map<String,dynamic>> _runLog    = [];
  List<Map<String,dynamic>> _schedule  = [];
  bool _loading = true;
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _fetch();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  void _fetch() {
    setState(() => _loading = true);
    _socket.emitWithAck('admin:get_jobs', {}, ack: (response) {
      if (!mounted) return;
      final res = Map<String, dynamic>.from(response as Map);
      if (res['success'] == true) {
        _cronJobs = List<Map<String,dynamic>>.from(res['cron_jobs'] ?? []);
        _runLog   = List<Map<String,dynamic>>.from(res['run_log']   ?? []);
      } else {
        _showError(res['error'] ?? 'Failed to load jobs');
      }
      // Also fetch schedule
      _socket.emitWithAck('admin:get_tournament_schedule', {}, ack: (r2) {
        if (!mounted) return;
        final res2 = Map<String, dynamic>.from(r2 as Map);
        if (res2['success'] == true) {
          _schedule = List<Map<String,dynamic>>.from(res2['schedule'] ?? []);
        }
        setState(() => _loading = false);
      });
    });
  }

  void _deleteScheduleItem(String id) {
    _socket.emitWithAck('admin:delete_tournament_schedule', {'id': id}, ack: (res) {
      if (!mounted) return;
      if ((res as Map)['success'] == true) _fetch();
      else _showError(res['error'] ?? 'Delete failed');
    });
  }

  void _openScheduleDialog([Map<String,dynamic>? item]) {
    showDialog(
      context: context,
      builder: (_) => _EditScheduleDialog(
        item: item,
        onSave: (fields) {
          _socket.emitWithAck('admin:upsert_tournament_schedule', fields, ack: (res) {
            if (!mounted) return;
            if ((res as Map)['success'] == true) _fetch();
            else _showError(res['error'] ?? 'Save failed');
          });
        },
      ),
    );
  }

  void _deleteRunLog(String jobId) {
    _socket.emitWithAck('admin:delete_job', {'jobId': jobId}, ack: (res) {
      if (!mounted) return;
      final r = Map<String, dynamic>.from(res as Map);
      if (r['success'] == true) _fetch();
      else _showError(r['error'] ?? 'Delete failed');
    });
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg, style: const TextStyle(color: Colors.white)),
               backgroundColor: Colors.red));
  }

  void _openEditDialog(Map<String,dynamic> job) {
    showDialog(
      context: context,
      builder: (_) => _EditCronDialog(
        job: job,
        onSave: (fields) {
          _socket.emitWithAck('admin:update_cron_job', {
            'type': job['type'],
            ...fields,
          }, ack: (res) {
            if (!mounted) return;
            final r = Map<String, dynamic>.from(res as Map);
            if (r['success'] == true) _fetch();
            else _showError(r['error'] ?? 'Update failed');
          });
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).value;
    final userTz = user?.timezone ?? 'UTC';

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: DTheme.textMainDark),
          onPressed: () => context.pop(),
        ),
        title: Text('Admin — Jobs',
            style: GoogleFonts.outfit(color: DTheme.textMainDark, fontWeight: FontWeight.bold)),
        actions: [
          _DoubleClock(userTimezone: userTz),
          const SizedBox(width: 8),
          IconButton(icon: const Icon(Icons.refresh, color: DTheme.textMainDark), onPressed: _fetch),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: DTheme.primary,
          unselectedLabelColor: Colors.white54,
          indicatorColor: DTheme.primary,
          tabs: const [
            Tab(text: 'Cron Schedule'),
            Tab(text: 'Run Log'),
            Tab(text: 'Daily Schedule'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabs,
              children: [
                _buildCronTable(),
                _buildRunLog(),
                _buildScheduleTab(),
              ],
            ),
    );
  }

  // ── Cron Schedule Tab ───────────────────────────────────────────────────────

  Widget _buildCronTable() {
    if (_cronJobs.isEmpty) {
      return Center(child: Text('No cron jobs found.', style: DTheme.bodyMuted));
    }
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: GlassPanel(
        padding: const EdgeInsets.all(16),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            headingTextStyle: GoogleFonts.outfit(
                color: DTheme.textMainDark, fontWeight: FontWeight.bold, fontSize: 13),
            dataTextStyle: DTheme.body.copyWith(fontSize: 12),
            columns: const [
              DataColumn(label: Text('Job Type')),
              DataColumn(label: Text('Description')),
              DataColumn(label: Text('Schedule (min hr wd)')),
              DataColumn(label: Text('Human Readable')),
              DataColumn(label: Text('Enabled')),
              DataColumn(label: Text('Last Run')),
              DataColumn(label: Text('Last Status')),
              DataColumn(label: Text('Edit')),
            ],
            rows: _cronJobs.map((job) {
              final lastStatus = job['last_run_status'] as String?;
              return DataRow(cells: [
                DataCell(Text(job['type'] ?? '—',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace'))),
                DataCell(SizedBox(
                    width: 320,
                    child: Text(job['description'] ?? '—',
                        maxLines: 2, overflow: TextOverflow.ellipsis))),
                DataCell(Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(6)),
                  child: Text(_cronLabel(job),
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 13, color: Colors.white)),
                )),
                DataCell(Text(_cronHuman(job), style: const TextStyle(color: Colors.white70))),
                DataCell(Switch(
                  value: job['enabled'] == true,
                  activeColor: DTheme.success,
                  onChanged: (v) {
                    _socket.emitWithAck('admin:update_cron_job', {
                      'type': job['type'],
                      'enabled': v,
                    }, ack: (res) {
                      if (!mounted) return;
                      if ((res as Map)['success'] == true) _fetch();
                    });
                  },
                )),
                DataCell(Text(_fmtTs(job['last_run_at']),
                    style: const TextStyle(color: Colors.white54, fontSize: 11))),
                DataCell(lastStatus == null
                    ? const Text('—', style: TextStyle(color: Colors.white38))
                    : Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                            color: _statusColor(lastStatus).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8)),
                        child: Text(lastStatus,
                            style: TextStyle(
                                color: _statusColor(lastStatus),
                                fontWeight: FontWeight.bold, fontSize: 11)))),
                DataCell(IconButton(
                  icon: const Icon(Icons.edit, color: Colors.white54, size: 18),
                  tooltip: 'Edit schedule',
                  onPressed: () => _openEditDialog(job),
                )),
              ]);
            }).toList(),
          ),
        ),
      ),
    );
  }

  // ── Run Log Tab ─────────────────────────────────────────────────────────────

  Widget _buildRunLog() {
    if (_runLog.isEmpty) {
      return Center(child: Text('No run history yet.', style: DTheme.bodyMuted));
    }
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: GlassPanel(
        padding: const EdgeInsets.all(16),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            headingTextStyle: GoogleFonts.outfit(
                color: DTheme.textMainDark, fontWeight: FontWeight.bold, fontSize: 13),
            dataTextStyle: DTheme.body.copyWith(fontSize: 12),
            columns: const [
              DataColumn(label: Text('Type')),
              DataColumn(label: Text('Status')),
              DataColumn(label: Text('Started At')),
              DataColumn(label: Text('Completed At')),
              DataColumn(label: Text('Worker')),
              DataColumn(label: Text('Error')),
              DataColumn(label: Text('Delete')),
            ],
            rows: _runLog.map((job) {
              final status = job['status'] as String?;
              return DataRow(cells: [
                DataCell(Text(job['type'] ?? '—',
                    style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold))),
                DataCell(Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                      color: _statusColor(status).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8)),
                  child: Text(status ?? '—',
                      style: TextStyle(color: _statusColor(status),
                          fontWeight: FontWeight.bold, fontSize: 11)),
                )),
                DataCell(Text(_fmtTs(job['started_at']),
                    style: const TextStyle(fontSize: 11, color: Colors.white54))),
                DataCell(Text(_fmtTs(job['completed_at']),
                    style: const TextStyle(fontSize: 11, color: Colors.white54))),
                DataCell(Text(job['worker_id']?.toString() ?? '—',
                    style: const TextStyle(fontSize: 10, color: Colors.white38))),
                DataCell(SizedBox(
                  width: 180,
                  child: Text(job['error']?.toString() ?? '—',
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          color: job['error'] != null ? Colors.redAccent : Colors.white38,
                          fontSize: 11)),
                )),
                DataCell(IconButton(
                  icon: const Icon(Icons.delete, color: Colors.redAccent, size: 18),
                  onPressed: () => _deleteRunLog(job['id']),
                )),
              ]);
            }).toList(),
          ),
        ),
      ),
    );
  }

  // ── Daily Schedule Tab ──────────────────────────────────────────────────────

  static const _fmtEmoji = {
    'swiss': '🏔️', 'arena': '⚔️', 'knockout': '🥊', 'round_robin': '🔄',
  };

  Widget _buildScheduleTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: GlassPanel(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text('Daily Tournament Templates',
                      style: GoogleFonts.outfit(
                          color: DTheme.textMainDark,
                          fontWeight: FontWeight.bold,
                          fontSize: 14))),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                      backgroundColor: DTheme.primary,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8)),
                  icon: const Icon(Icons.add, size: 16, color: Colors.white),
                  label: const Text('Add', style: TextStyle(color: Colors.white, fontSize: 13)),
                  onPressed: () => _openScheduleDialog(),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (_schedule.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Center(
                    child: Text('No schedule entries. Add one above.',
                        style: DTheme.bodyMuted)))
            else
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingTextStyle: GoogleFonts.outfit(
                      color: DTheme.textMainDark,
                      fontWeight: FontWeight.bold,
                      fontSize: 13),
                  dataTextStyle: DTheme.body.copyWith(fontSize: 12),
                  columns: const [
                    DataColumn(label: Text('Format')),
                    DataColumn(label: Text('TC')),
                    DataColumn(label: Text('Start (UTC)')),
                    DataColumn(label: Text('Mode')),
                    DataColumn(label: Text('Duration')),
                    DataColumn(label: Text('Max P')),
                    DataColumn(label: Text('Bots')),
                    DataColumn(label: Text('On')),
                    DataColumn(label: Text('Edit')),
                    DataColumn(label: Text('Del')),
                  ],
                  rows: _schedule.map((item) {
                    final fmt        = item['format']      as String? ?? '?';
                    final emoji      = _fmtEmoji[fmt] ?? '🎯';
                    final minutes    = item['minutes']          ?? 10;
                    final increment  = item['increment']        ?? 5;
                    final launchH    = item['launch_hour']      ?? 20;
                    final launchMode = item['launch_mode'] as String? ?? 'both';
                    final duration   = item['duration']         ?? 7;
                    final maxP       = item['max_participants'] ?? 100;
                    final bots       = item['invited_bots']     ?? 0;
                    final enabled    = item['enabled'] == true;
                    final needsTime  = launchMode != 'when_complete';

                    final modeColor = switch (launchMode) {
                      'when_complete' => const Color(0xFF22C55E),
                      'at_time'       => const Color(0xFF46B0D4),
                      'starts_in'     => const Color(0xFFAB7DF8),
                      _               => const Color(0xFFF59E0B), // any / both
                    };
                    final modeLabel = switch (launchMode) {
                      'when_complete' => 'Full',
                      'at_time'       => 'Time',
                      'starts_in'     => '+⏱',
                      _               => 'Any',  // any / both
                    };

                    return DataRow(cells: [
                      DataCell(Text('$emoji ${fmt.replaceAll('_', ' ')}',
                          style: const TextStyle(fontWeight: FontWeight.w600))),
                      DataCell(Text('${minutes}+${increment}',
                          style: const TextStyle(fontFamily: 'monospace'))),
                      DataCell(needsTime
                          ? Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(6)),
                              child: Text(
                                  switch (launchMode) {
                                    'at_time' || 'any' || 'both' =>
                                        '${launchH.toString().padLeft(2,'0')}:00 UTC',
                                    'starts_in' =>
                                        '+${item['start_in_minutes'] ?? 0} min',
                                    _ => '—',
                                  },
                                  style: const TextStyle(fontFamily: 'monospace', color: Colors.white)),
                            )
                          : const Text('—', style: TextStyle(color: Colors.white38))),
                      DataCell(Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                            color: modeColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: modeColor.withValues(alpha: 0.4))),
                        child: Text(modeLabel,
                            style: TextStyle(color: modeColor,
                                fontSize: 11, fontWeight: FontWeight.w600)),
                      )),
                      DataCell(Text('$duration ${fmt == 'arena' ? 'min' : 'rds'}',
                          style: const TextStyle(color: Colors.white70))),
                      DataCell(Text('$maxP')),
                      DataCell(Text('$bots')),
                      DataCell(Switch(
                        value: enabled,
                        activeColor: DTheme.success,
                        onChanged: (v) {
                          _socket.emitWithAck('admin:upsert_tournament_schedule', {
                            ...item,
                            'enabled': v,
                          }, ack: (res) {
                            if (!mounted) return;
                            if ((res as Map)['success'] == true) _fetch();
                          });
                        },
                      )),
                      DataCell(IconButton(
                        icon: const Icon(Icons.edit, color: Colors.white54, size: 18),
                        tooltip: 'Edit',
                        onPressed: () => _openScheduleDialog(item),
                      )),
                      DataCell(IconButton(
                        icon: const Icon(Icons.delete, color: Colors.redAccent, size: 18),
                        tooltip: 'Delete',
                        onPressed: () => _deleteScheduleItem(item['id'] as String),
                      )),
                    ]);
                  }).toList(),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Edit Cron Dialog ──────────────────────────────────────────────────────────

class _EditCronDialog extends StatefulWidget {
  final Map<String,dynamic> job;
  final void Function(Map<String,dynamic> fields) onSave;
  const _EditCronDialog({required this.job, required this.onSave});
  @override
  State<_EditCronDialog> createState() => _EditCronDialogState();
}

class _EditCronDialogState extends State<_EditCronDialog> {
  late TextEditingController _minCtrl;
  late TextEditingController _hrCtrl;
  late TextEditingController _wdCtrl;
  late TextEditingController _descCtrl;

  @override
  void initState() {
    super.initState();
    _minCtrl  = TextEditingController(text: widget.job['minute']?.toString()  ?? '*');
    _hrCtrl   = TextEditingController(text: widget.job['hour']?.toString()    ?? '*');
    _wdCtrl   = TextEditingController(text: widget.job['weekday']?.toString() ?? '*');
    _descCtrl = TextEditingController(text: widget.job['description']?.toString() ?? '');
  }

  @override
  void dispose() {
    _minCtrl.dispose(); _hrCtrl.dispose(); _wdCtrl.dispose(); _descCtrl.dispose();
    super.dispose();
  }

  dynamic _parseField(String v) => (v.trim() == '*') ? '*' : (int.tryParse(v.trim()) ?? v.trim());

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: DTheme.bgDarkTop,
      title: Text('Edit Schedule — ${widget.job['type']}',
          style: GoogleFonts.outfit(color: DTheme.textMainDark, fontSize: 16)),
      content: SizedBox(
        width: 380,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Use * for "any". Examples:',
                style: GoogleFonts.outfit(color: Colors.white54, fontSize: 12)),
            Text('  0 0 * = daily at 00:00 UTC\n  0 8 1 = Mon at 08:00 UTC\n  30 * * = every hour at :30',
                style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: Colors.white38)),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(child: _field('Minute (0–59)', _minCtrl)),
              const SizedBox(width: 8),
              Expanded(child: _field('Hour (0–23)', _hrCtrl)),
              const SizedBox(width: 8),
              Expanded(child: _field('Weekday (0–7)', _wdCtrl)),
            ]),
            const SizedBox(height: 16),
            _field('Description', _descCtrl),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: DTheme.primary),
          onPressed: () {
            widget.onSave({
              'minute':      _parseField(_minCtrl.text),
              'hour':        _parseField(_hrCtrl.text),
              'weekday':     _parseField(_wdCtrl.text),
              'description': _descCtrl.text.trim(),
            });
            Navigator.pop(context);
          },
          child: const Text('Save', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }

  Widget _field(String label, TextEditingController ctrl) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: GoogleFonts.outfit(color: Colors.white54, fontSize: 12)),
      const SizedBox(height: 4),
      TextField(
        controller: ctrl,
        style: const TextStyle(color: Colors.white, fontFamily: 'monospace'),
        decoration: const InputDecoration(
          filled: true, fillColor: Colors.black26,
          border: OutlineInputBorder(),
          isDense: true, contentPadding: EdgeInsets.all(10),
        ),
      ),
    ],
  );
}

// ── Edit Schedule Item Dialog ─────────────────────────────────────────────────

class _EditScheduleDialog extends StatefulWidget {
  final Map<String,dynamic>? item; // null = new entry
  final void Function(Map<String,dynamic>) onSave;
  const _EditScheduleDialog({required this.item, required this.onSave});
  @override
  State<_EditScheduleDialog> createState() => _EditScheduleDialogState();
}

class _EditScheduleDialogState extends State<_EditScheduleDialog> {
  String _format     = 'arena';
  String _launchMode = 'any';
  late TextEditingController _minCtrl, _incCtrl, _durCtrl, _hrCtrl, _maxCtrl, _botsCtrl, _startInCtrl;
  bool _enabled = true;

  @override
  void initState() {
    super.initState();
    final i = widget.item;
    _format     = i?['format']      as String? ?? 'arena';
    // Normalise old 'both' rows to 'any'
    final rawMode = i?['launch_mode'] as String? ?? 'any';
    _launchMode = rawMode == 'both' ? 'any' : rawMode;
    _enabled    = i?['enabled'] != false;
    _minCtrl     = TextEditingController(text: '${i?['minutes']          ?? 10}');
    _incCtrl     = TextEditingController(text: '${i?['increment']        ?? 5}');
    _durCtrl     = TextEditingController(text: '${i?['duration']         ?? 7}');
    _hrCtrl      = TextEditingController(text: '${i?['launch_hour']      ?? 20}');
    _maxCtrl     = TextEditingController(text: '${i?['max_participants'] ?? 100}');
    _botsCtrl    = TextEditingController(text: '${i?['invited_bots']     ?? 0}');
    _startInCtrl = TextEditingController(text: '${i?['start_in_minutes'] ?? 0}');
  }

  @override
  void dispose() {
    for (final c in [_minCtrl, _incCtrl, _durCtrl, _hrCtrl, _maxCtrl, _botsCtrl, _startInCtrl]) c.dispose();
    super.dispose();
  }

  int _int(TextEditingController c, int fb) => int.tryParse(c.text.trim()) ?? fb;

  @override
  Widget build(BuildContext context) {
    final isNew = widget.item == null;
    final durationLabel = _format == 'arena' ? 'Duration (min)' : 'Rounds';
    final needsTime = _launchMode != 'when_complete';
    return AlertDialog(
      backgroundColor: DTheme.bgDarkTop,
      title: Text(isNew ? 'Add Schedule Entry' : 'Edit Schedule Entry',
          style: GoogleFonts.outfit(color: DTheme.textMainDark, fontSize: 16)),
      content: SizedBox(
        width: 460,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Format
              Text('Format', style: GoogleFonts.outfit(color: Colors.white54, fontSize: 12)),
              const SizedBox(height: 6),
              SegmentedButton<String>(
                style: SegmentedButton.styleFrom(
                    foregroundColor: DTheme.primary,
                    selectedForegroundColor: Colors.white,
                    selectedBackgroundColor: DTheme.primary),
                segments: const [
                  ButtonSegment(value: 'arena',       label: Text('⚔️ Arena')),
                  ButtonSegment(value: 'swiss',       label: Text('🏔️ Swiss')),
                  ButtonSegment(value: 'knockout',    label: Text('🥊 KO')),
                  ButtonSegment(value: 'round_robin', label: Text('🔄 RR')),
                ],
                selected: {_format},
                onSelectionChanged: (s) => setState(() => _format = s.first),
              ),
              const SizedBox(height: 16),
              // Launch mode
              Text('Start mode', style: GoogleFonts.outfit(color: Colors.white54, fontSize: 12)),
              const SizedBox(height: 6),
              SegmentedButton<String>(
                style: SegmentedButton.styleFrom(
                    foregroundColor: DTheme.primary,
                    selectedForegroundColor: Colors.white,
                    selectedBackgroundColor: DTheme.primary),
                segments: const [
                  ButtonSegment(value: 'when_complete', label: Text('When full')),
                  ButtonSegment(value: 'at_time',       label: Text('At time')),
                  ButtonSegment(value: 'starts_in',     label: Text('Starts in')),
                  ButtonSegment(value: 'any',           label: Text('Any')),
                ],
                selected: {_launchMode},
                onSelectionChanged: (s) => setState(() => _launchMode = s.first),
              ),
              const SizedBox(height: 6),
              Text(
                switch (_launchMode) {
                  'when_complete' => 'Starts as soon as the max number of players join.',
                  'at_time'       => 'Starts at the UTC hour below, regardless of player count.\n'
                                     'Anchored to midnight UTC of the day the job runs.',
                  'starts_in'     => 'Starts N minutes after the job executes.\n'
                                     'E.g. job runs at 14:00 + 45 min → starts at 14:45.',
                  _               => '"Any" = starts as soon as the first condition is met:\n'
                                     'max players reached, UTC hour passed, OR delay elapsed.',
                },
                style: GoogleFonts.outfit(color: Colors.white38, fontSize: 11),
              ),
              const SizedBox(height: 16),
              // TC + duration
              Row(children: [
                Expanded(child: _numField('Minutes', _minCtrl)),
                const SizedBox(width: 8),
                Expanded(child: _numField('Increment', _incCtrl)),
                const SizedBox(width: 8),
                Expanded(child: _numField(durationLabel, _durCtrl)),
              ]),
              const SizedBox(height: 12),
              // Launch hour — shown for at_time / any
              if (_launchMode == 'at_time' || _launchMode == 'any')
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _numField('Start hour (UTC 0–23)  ← anchored to midnight UTC', _hrCtrl),
                ),
              // Starts-in delay — shown for starts_in / any
              if (_launchMode == 'starts_in' || _launchMode == 'any')
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _numField('Starts in (minutes after job runs)', _startInCtrl),
                ),
              Row(children: [
                Expanded(child: _numField('Max players', _maxCtrl)),
                const SizedBox(width: 8),
                Expanded(child: _numField('Invited bots', _botsCtrl)),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                Switch(value: _enabled, activeColor: DTheme.success,
                    onChanged: (v) => setState(() => _enabled = v)),
                const SizedBox(width: 8),
                Text('Enabled', style: GoogleFonts.outfit(color: Colors.white70)),
              ]),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: DTheme.primary),
          onPressed: () {
            widget.onSave({
              if (widget.item?['id'] != null) 'id': widget.item!['id'],
              'format':           _format,
              'minutes':          _int(_minCtrl,     10),
              'increment':        _int(_incCtrl,     5),
              'duration':         _int(_durCtrl,     7),
              'launch_hour':      _int(_hrCtrl,      20),
              'launch_mode':      _launchMode,
              'start_in_minutes': _int(_startInCtrl, 0),
              'max_participants': _int(_maxCtrl,     100),
              'invited_bots':     _int(_botsCtrl,    0),
              'enabled':          _enabled,
            });
            Navigator.pop(context);
          },
          child: const Text('Save', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }

  Widget _numField(String label, TextEditingController ctrl, {bool enabled = true}) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: GoogleFonts.outfit(color: Colors.white54, fontSize: 11)),
      const SizedBox(height: 4),
      TextField(
        controller: ctrl,
        enabled: enabled,
        keyboardType: TextInputType.number,
        style: const TextStyle(color: Colors.white, fontFamily: 'monospace'),
        decoration: const InputDecoration(
          filled: true, fillColor: Colors.black26,
          border: OutlineInputBorder(),
          isDense: true, contentPadding: EdgeInsets.all(10),
        ),
      ),
    ],
  );
}
