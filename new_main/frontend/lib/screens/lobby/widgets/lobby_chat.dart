import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/chat_provider.dart';
import '../../../widgets/glass_panel.dart';

// ── Lobby Chat Widget ────────────────────────────────────────────────────────
// Reusable chat panel for both portrait (bottom) and landscape (sidebar) modes.

class LobbyChat extends ConsumerStatefulWidget {
  /// If true, fills available height (sidebar mode).
  /// If false, uses a fixed maxHeight (bottom panel mode).
  final bool fillHeight;
  final double? maxHeight;

  const LobbyChat({super.key, this.fillHeight = false, this.maxHeight});

  @override
  ConsumerState<LobbyChat> createState() => _LobbyChatState();
}

class _LobbyChatState extends ConsumerState<LobbyChat> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _focusNode = FocusNode();
  bool _cooldown = false;

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage() {
    final text = _controller.text.trim();
    if (text.isEmpty || _cooldown) return;

    ref.read(chatProvider.notifier).sendMessage(text);
    _controller.clear();

    // Visual cooldown
    final rateLimitMs = ref.read(chatProvider).rateLimitMs;
    setState(() => _cooldown = true);
    Future.delayed(Duration(milliseconds: rateLimitMs), () {
      if (mounted) setState(() => _cooldown = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final chat = ref.watch(chatProvider);
    final auth = ref.watch(authProvider).value;
    final isLoggedIn = auth != null && auth.role != 'guest';
    final canPost = isLoggedIn && auth.isChatUser;

    // Listen for error snackbar
    ref.listen(chatProvider.select((s) => s.error), (_, error) {
      if (error != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(error),
          backgroundColor: DTheme.danger,
          duration: const Duration(seconds: 3),
        ));
        ref.read(chatProvider.notifier).clearError();
      }
    });

    // Auto-scroll on new message
    ref.listen(chatProvider.select((s) => s.messages.length), (prev, next) {
      if (next > (prev ?? 0)) _scrollToBottom();
    });

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              const Icon(Icons.chat_bubble_outline, size: 16, color: Color(0xFF46B0D4)),
              const SizedBox(width: 6),
              Text('Chat',
                  style: GoogleFonts.outfit(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: DTheme.textMainDark)),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF46B0D4).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('${chat.messages.length}',
                    style: const TextStyle(
                        color: Color(0xFF46B0D4),
                        fontSize: 11,
                        fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),

        // Messages list
        Expanded(
          child: chat.loading
              ? const Center(
                  child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Color(0xFF46B0D4))))
              : chat.messages.isEmpty
                  ? Center(
                      child: Text('No messages yet.',
                          style: DTheme.bodyMuted.copyWith(fontSize: 12)))
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.only(bottom: 4),
                      itemCount: chat.messages.length,
                      itemBuilder: (_, i) => _ChatBubble(msg: chat.messages[i]),
                    ),
        ),

        // Input area
        if (canPost) ...[
          const SizedBox(height: 6),
          _buildInput(chat),
        ] else if (!isLoggedIn)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text('Log in to chat',
                style: GoogleFonts.outfit(
                    fontSize: 11,
                    color: DTheme.textMutedDark,
                    fontStyle: FontStyle.italic),
                textAlign: TextAlign.center),
          )
        else if (!auth.isChatUser)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text('Chat access disabled',
                style: GoogleFonts.outfit(
                    fontSize: 11,
                    color: Colors.redAccent,
                    fontStyle: FontStyle.italic),
                textAlign: TextAlign.center),
          ),
      ],
    );

    if (widget.fillHeight) {
      return GlassPanel(
        padding: const EdgeInsets.all(12),
        borderRadius: 14,
        child: content,
      );
    }

    return GlassPanel(
      padding: const EdgeInsets.all(12),
      borderRadius: 14,
      child: SizedBox(
        height: widget.maxHeight ?? 350,
        child: content,
      ),
    );
  }

  Widget _buildInput(ChatState chat) {
    final remaining = chat.maxChars - _controller.text.length;

    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _controller,
            focusNode: _focusNode,
            maxLength: chat.maxChars,
            maxLines: 1,
            style: GoogleFonts.outfit(fontSize: 13, color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Type a message…',
              hintStyle: GoogleFonts.outfit(fontSize: 12, color: Colors.white30),
              filled: true,
              fillColor: Colors.white.withValues(alpha: 0.06),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none,
              ),
              counterText: '', // hide default counter
              suffixText: remaining <= 50 ? '$remaining' : null,
              suffixStyle: GoogleFonts.outfit(
                fontSize: 10,
                color: remaining <= 10 ? Colors.redAccent : Colors.white30,
              ),
            ),
            onChanged: (_) => setState(() {}),
            onSubmitted: (_) => _sendMessage(),
            textInputAction: TextInputAction.send,
          ),
        ),
        const SizedBox(width: 6),
        GestureDetector(
          onTap: _cooldown || _controller.text.trim().isEmpty ? null : _sendMessage,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.all(9),
            decoration: BoxDecoration(
              color: _cooldown || _controller.text.trim().isEmpty
                  ? Colors.white.withValues(alpha: 0.05)
                  : const Color(0xFF46B0D4).withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: _cooldown || _controller.text.trim().isEmpty
                    ? Colors.white.withValues(alpha: 0.08)
                    : const Color(0xFF46B0D4).withValues(alpha: 0.5),
              ),
            ),
            child: Icon(
              _cooldown ? Icons.hourglass_empty : Icons.send,
              size: 16,
              color: _cooldown || _controller.text.trim().isEmpty
                  ? Colors.white24
                  : const Color(0xFF46B0D4),
            ),
          ),
        ),
      ],
    );
  }
}

// ── Chat message bubble ──────────────────────────────────────────────────────

class _ChatBubble extends StatelessWidget {
  final ChatMessage msg;
  const _ChatBubble({required this.msg});

  String _formatTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Timestamp
          Text(
            _formatTime(msg.createdAt),
            style: GoogleFonts.sourceCodePro(
                fontSize: 9, color: Colors.white24, height: 1.6),
          ),
          const SizedBox(width: 6),
          // Username + message
          Expanded(
            child: RichText(
              text: TextSpan(
                children: [
                  TextSpan(
                    text: '${msg.username}  ',
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF46B0D4),
                      height: 1.5,
                    ),
                  ),
                  TextSpan(
                    text: msg.message,
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      color: Colors.white.withValues(alpha: 0.85),
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
