import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/translations_provider.dart';
import '../../widgets/glass_panel.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(authProvider.notifier).login(
      _usernameCtrl.text.trim(),
      _passwordCtrl.text,
    );
    final authState = ref.read(authProvider);
    if (authState.hasError) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Login failed: ${authState.error}'), backgroundColor: DTheme.danger),
        );
      }
    } else if (mounted) {
      context.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(authProvider).isLoading;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topRight,
            radius: 1.5,
            colors: [DTheme.bgDarkTop, DTheme.bgDark],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: GlassPanel(
                  padding: const EdgeInsets.all(32),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(ref.tr('ui.welcome_back'), style: DTheme.heading),
                        const SizedBox(height: 8),
                        Text(ref.tr('ui.sign_in_to_play'), style: DTheme.subtitle),
                        const SizedBox(height: 32),

                        // Username / email
                        TextFormField(
                          controller: _usernameCtrl,
                          style: DTheme.body,
                          decoration: InputDecoration(
                            labelText: ref.tr('ui.username_or_email'),
                            prefixIcon: const Icon(Icons.person_outline, color: DTheme.primary),
                          ),
                          validator: (v) => (v?.isEmpty ?? true) ? 'Required' : null,
                        ),
                        const SizedBox(height: 16),

                        // Password
                        TextFormField(
                          controller: _passwordCtrl,
                          obscureText: _obscure,
                          style: DTheme.body,
                          decoration: InputDecoration(
                            labelText: ref.tr('ui.password'),
                            prefixIcon: const Icon(Icons.lock_outline, color: DTheme.primary),
                            suffixIcon: IconButton(
                              icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility, color: DTheme.textMutedDark),
                              onPressed: () => setState(() => _obscure = !_obscure),
                            ),
                          ),
                          validator: (v) => (v?.isEmpty ?? true) ? 'Required' : null,
                          onFieldSubmitted: (_) => _submit(),
                        ),
                        const SizedBox(height: 28),

                        // Login button
                        SizedBox(
                          height: 48,
                          child: ElevatedButton(
                            onPressed: isLoading ? null : _submit,
                            child: isLoading
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : Text(ref.tr('ui.sign_in')),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Register link
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('${ref.tr('ui.no_account')} ', style: DTheme.bodyMuted),
                            TextButton(
                              onPressed: () => context.go('/register'),
                              child: Text(ref.tr('ui.register'), style: const TextStyle(color: DTheme.primary, fontWeight: FontWeight.w600)),
                            ),
                          ],
                        ),
                        TextButton(
                          onPressed: () => context.go('/'),
                          child: Text(ref.tr('ui.continue_as_guest'), style: DTheme.bodyMuted),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
