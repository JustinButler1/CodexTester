import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { supabase } from '@/src/shared/supabase-client';
import { useAuth } from '@/src/shared/auth-context';
import { ensureProfile } from '@/src/shared/profile-service';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const handleSubmit = React.useCallback(async () => {
    if (!email || !password || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }
    if (data.user) {
      try {
        await ensureProfile(data.user);
      } catch (profileError) {
        console.error('Failed to ensure profile', profileError);
      }
    }
    setIsSubmitting(false);
    router.replace('/');
  }, [email, password, isSubmitting, router]);

  const handleNavigateToSignUp = React.useCallback(() => {
    if (!isSubmitting) {
      router.replace('/sign-up');
    }
  }, [router, isSubmitting]);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <Text style={styles.backLink} onPress={() => router.back()}>
        Go back
      </Text>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        style={styles.cardWrapper}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Enter your credentials to continue managing your game nights.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.dark.neutral}
              style={styles.input}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              returnKeyType="next"
              keyboardAppearance="dark"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor={Colors.dark.neutral}
              style={styles.input}
              secureTextEntry
              textContentType="password"
              returnKeyType="done"
              keyboardAppearance="dark"
            />
          </View>

          {error ? <Text style={styles.errorLabel}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
            activeOpacity={0.85}
            disabled={isSubmitting}
            onPress={handleSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonLabel}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={handleNavigateToSignUp}
          >
            <Text style={styles.secondaryButtonLabel}>Create an account instead</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 24,
  },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: Colors.dark.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 20,
  },
  backLink: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    marginLeft: 12,
    color: Colors.dark.textSecondary,
    letterSpacing: 0.3,
  },
  header: {
    gap: 10,
  },
  title: {
    color: Colors.dark.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    color: Colors.dark.textPrimary,
    fontSize: 16,
  },
  primaryButton: {
    alignItems: 'center',
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 16,
    backgroundColor: Colors.dark.accent,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonLabel: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonLabel: {
    textAlign: 'center',
    color: Colors.dark.accentSoft,
    fontSize: 15,
    fontWeight: '600',
  },
  errorLabel: {
    marginTop: -6,
    color: Colors.dark.negative,
    fontSize: 13,
  },
});
