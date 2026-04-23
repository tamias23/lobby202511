import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
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

// ── Screen ────────────────────────────────────────────────────────────────────

class AdminJobsScreen extends ConsumerStatefulWidget {
  const AdminJobsScreen({super.key});
  @override
  ConsumerState<AdminJobsScreen> createState() => _AdminJobsScreenState();
}

class _AdminJobsScreenState extends ConsumerState<AdminJobsScreen>
    with SingleTickerProviderStateMixin {
  final _socket = SocketService.instance;
  List<Map<String,dynamic>> _cronJobs = [];
  List<Map<String,dynamic>> _runLog   = [];
  bool _loading = true;
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
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
      final res = response as Map<String,dynamic>;
      if (res['success'] == true) {
        setState(() {
          _cronJobs = List<Map<String,dynamic>>.from(res['cron_jobs'] ?? []);
          _runLog   = List<Map<String,dynamic>>.from(res['run_log']   ?? []);
          _loading  = false;
        });
      } else {
        setState(() => _loading = false);
        _showError(res['error'] ?? 'Failed to load jobs');
      }
    });
  }

  void _deleteRunLog(String jobId) {
    _socket.emitWithAck('admin:delete_job', {'jobId': jobId}, ack: (res) {
      if (!mounted) return;
      final r = res as Map<String,dynamic>;
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
            final r = res as Map<String,dynamic>;
            if (r['success'] == true) _fetch();
            else _showError(r['error'] ?? 'Update failed');
          });
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
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
                    width: 200,
                    child: Text(job['description'] ?? '—', overflow: TextOverflow.ellipsis))),
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
