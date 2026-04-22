import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import '../../core/socket_service.dart';
import '../../core/theme.dart';
import '../../widgets/glass_panel.dart';
import 'dart:convert';
import 'package:timezone/timezone.dart' as tz;
import '../../providers/auth_provider.dart';

String _formatDate(int timestamp, String timezone) {
  try {
    final location = tz.getLocation(timezone);
    final dt = tz.TZDateTime.fromMillisecondsSinceEpoch(location, timestamp);
    return "${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} "
           "${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')} "
           "${dt.timeZoneName}";
  } catch (_) {
    final dt = DateTime.fromMillisecondsSinceEpoch(timestamp, isUtc: true);
    return "${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} "
           "${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')} UTC";
  }
}

String _formatDateNoTz(DateTime d) {
  return "${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}";
}

class AdminJobsScreen extends ConsumerStatefulWidget {
  const AdminJobsScreen({super.key});

  @override
  ConsumerState<AdminJobsScreen> createState() => _AdminJobsScreenState();
}

class _AdminJobsScreenState extends ConsumerState<AdminJobsScreen> {
  final _socket = SocketService.instance;
  List<Map<String, dynamic>> _jobs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchJobs();
  }

  void _fetchJobs() {
    setState(() => _loading = true);
    _socket.emitWithAck('admin:get_jobs', {}, ack: (response) {
      if (!mounted) return;
      final res = response as Map<String, dynamic>;
      if (res['success'] == true && res['data'] != null) {
        setState(() {
          _jobs = List<Map<String, dynamic>>.from(res['data']);
          _loading = false;
        });
      } else {
        setState(() => _loading = false);
        _showError(res['error'] ?? 'Failed to load jobs');
      }
    });
  }

  void _deleteJob(String jobId) {
    _socket.emitWithAck('admin:delete_job', {'jobId': jobId}, ack: (response) {
      if (!mounted) return;
      final res = response as Map<String, dynamic>;
      if (res['success'] == true) {
        _fetchJobs();
      } else {
        _showError(res['error'] ?? 'Failed to delete job');
      }
    });
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg, style: const TextStyle(color: Colors.white)), backgroundColor: Colors.red));
  }

  void _openCreateJobDialog() {
    final auth = ref.read(authProvider).value;
    final userTimezone = auth?.timezone ?? 'UTC';

    showDialog(
      context: context,
      builder: (context) => _CreateJobDialog(
        timezone: userTimezone,
        onJobCreated: (type, payload, scheduledAt) {
          _socket.emitWithAck('admin:create_job', {
            'type': type,
            'payload': payload,
            'scheduled_at': scheduledAt.millisecondsSinceEpoch,
          }, ack: (response) {
            if (!mounted) return;
            final res = response as Map<String, dynamic>;
            if (res['success'] == true) {
              _fetchJobs();
            } else {
              _showError(res['error'] ?? 'Failed to create job');
            }
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
        title: Text('Admin Dashboard - Jobs', style: GoogleFonts.outfit(color: DTheme.textMainDark, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: DTheme.textMainDark),
            onPressed: _fetchJobs,
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: DTheme.primary, foregroundColor: Colors.white),
              onPressed: _openCreateJobDialog,
              icon: const Icon(Icons.add),
              label: const Text('New Job'),
            ),
          )
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _jobs.isEmpty
              ? Center(child: Text('No jobs found.', style: DTheme.bodyMuted))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: GlassPanel(
                    padding: const EdgeInsets.all(16),
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: DataTable(
                        headingTextStyle: GoogleFonts.outfit(color: DTheme.textMainDark, fontWeight: FontWeight.bold),
                        dataTextStyle: DTheme.body,
                        columns: const [
                          DataColumn(label: Text('Type')),
                          DataColumn(label: Text('Status')),
                          DataColumn(label: Text('Scheduled For')),
                          DataColumn(label: Text('Payload')),
                          DataColumn(label: Text('Actions')),
                        ],
                        rows: _jobs.map((job) {
                          final auth = ref.watch(authProvider).value;
                          final userTimezone = auth?.timezone ?? 'UTC';
                          final timestamp = job['scheduled_at'] as int? ?? 0;
                          final scheduledDate = DateTime.fromMillisecondsSinceEpoch(timestamp);
                          final isPast = scheduledDate.isBefore(DateTime.now());
                          final statusColor = job['status'] == 'DONE' ? DTheme.success : job['status'] == 'FAILED' ? Colors.red : job['status'] == 'RUNNING' ? Colors.blue : Colors.orange;
                          
                          return DataRow(
                            cells: [
                              DataCell(Text(job['type'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold))),
                              DataCell(Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                                child: Text(job['status'] ?? 'UNKNOWN', style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.bold)),
                              )),
                              DataCell(Text('${_formatDate(timestamp, userTimezone)}${isPast && job['status'] == 'SCHEDULED' ? ' (Overdue)' : ''}')),
                              DataCell(SizedBox(
                                width: 200,
                                child: Text(jsonEncode(job['payload'] ?? {}), overflow: TextOverflow.ellipsis),
                              )),
                              DataCell(
                                IconButton(
                                  icon: const Icon(Icons.delete, color: Colors.redAccent),
                                  tooltip: 'Delete Job',
                                  onPressed: () {
                                    showDialog(
                                      context: context,
                                      builder: (_) => AlertDialog(
                                        backgroundColor: DTheme.bgDark,
                                        title: const Text('Delete Job?', style: TextStyle(color: Colors.white)),
                                        content: const Text('This action cannot be undone.', style: TextStyle(color: Colors.white70)),
                                        actions: [
                                          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                                          ElevatedButton(
                                            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                                            onPressed: () {
                                              Navigator.pop(context);
                                              _deleteJob(job['id']);
                                            },
                                            child: const Text('Delete', style: TextStyle(color: Colors.white)),
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ],
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                ),
    );
  }
}

class _CreateJobDialog extends StatefulWidget {
  final String timezone;
  final void Function(String type, Map<String, dynamic> payload, DateTime scheduledAt) onJobCreated;
  const _CreateJobDialog({required this.timezone, required this.onJobCreated});

  @override
  State<_CreateJobDialog> createState() => _CreateJobDialogState();
}

class _CreateJobDialogState extends State<_CreateJobDialog> {
  String _selectedType = 'launch_tournament';
  late DateTime _scheduledAt;
  final _payloadController = TextEditingController(text: '{\n  "format": "swiss",\n  "minutes": 10,\n  "increment": 5\n}');

  @override
  void initState() {
    super.initState();
    try {
      final location = tz.getLocation(widget.timezone);
      _scheduledAt = tz.TZDateTime.now(location).add(const Duration(hours: 1));
    } catch (_) {
      _scheduledAt = DateTime.now().add(const Duration(hours: 1));
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: DTheme.bgDarkTop,
      title: Text('Create Scheduled Job', style: GoogleFonts.outfit(color: DTheme.textMainDark)),
      content: SizedBox(
        width: 400,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Job Type', style: DTheme.bodyMuted),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _selectedType,
              dropdownColor: DTheme.bgDark,
              style: const TextStyle(color: Colors.white),
              items: const [
                DropdownMenuItem(value: 'launch_tournament', child: Text('launch_tournament')),
                DropdownMenuItem(value: 'data_export', child: Text('data_export')),
              ],
              onChanged: (v) => setState(() {
                _selectedType = v!;
                if (_selectedType == 'data_export') {
                  _payloadController.text = '{}';
                }
              }),
            ),
            const SizedBox(height: 16),
            Text('Scheduled At', style: DTheme.bodyMuted),
            const SizedBox(height: 8),
            InkWell(
              onTap: () async {
                final date = await showDatePicker(context: context, initialDate: _scheduledAt, firstDate: DateTime.now(), lastDate: DateTime(2030));
                if (date != null && mounted) {
                  final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(_scheduledAt));
                  if (time != null && mounted) {
                    setState(() {
                      try {
                        final location = tz.getLocation(widget.timezone);
                        _scheduledAt = tz.TZDateTime(location, date.year, date.month, date.day, time.hour, time.minute);
                      } catch (_) {
                        _scheduledAt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
                      }
                    });
                  }
                }
              },
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(8)),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_today, size: 16, color: Colors.white),
                    const SizedBox(width: 8),
                    Text(_formatDateNoTz(_scheduledAt), style: const TextStyle(color: Colors.white)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text('JSON Payload', style: DTheme.bodyMuted),
            const SizedBox(height: 8),
            TextField(
              controller: _payloadController,
              maxLines: 4,
              style: const TextStyle(color: Colors.white, fontFamily: 'monospace', fontSize: 12),
              decoration: const InputDecoration(
                filled: true,
                fillColor: Colors.black26,
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: DTheme.primary),
          onPressed: () {
            try {
              final payload = jsonDecode(_payloadController.text) as Map<String, dynamic>;
              widget.onJobCreated(_selectedType, payload, _scheduledAt);
              Navigator.pop(context);
            } catch (e) {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Invalid JSON payload: $e')));
            }
          },
          child: const Text('Create Job', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }
}
