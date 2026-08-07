import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography, radius } from '../theme/theme';

export default function LoginScreen() {
  const { login, error } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!employeeId || !password) return;
    setSubmitting(true);
    await login(employeeId.trim(), password);
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.logoWrap}>
        <Image
          source={require('../../assets/adaptive-icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={typography.h1}>InnoSet</Text>
        <Text style={styles.subtitle}>Trip Tracking & TA/DA Management</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Employee ID / Email</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. EMP1024 or you@company.com"
          autoCapitalize="none"
          value={employeeId}
          onChangeText={setEmployeeId}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <AppButton title="Log In" onPress={handleLogin} loading={submitting} style={{ marginTop: spacing.md }} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xl },
  logoImage: {
    width: 88,
    height: 88,
    marginBottom: spacing.md,
  },
  subtitle: { ...typography.caption, marginTop: 4 },
  form: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  label: { ...typography.h3, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.background,
  },
  errorText: { color: colors.danger, marginTop: spacing.sm },
});