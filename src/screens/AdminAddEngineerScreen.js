import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../components/Card';
import AppButton from '../components/AppButton';
import { createEngineer } from '../services/adminService';
import { GRADES } from '../utils/policyRates';
import { colors, spacing, typography, radius } from '../theme/theme';

// A short, easy-to-read temporary password so the admin has something
// reasonable to hand over by default — they can still type their own.
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AdminAddEngineerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(generateTempPassword());
  const [grade, setGrade] = useState('IE7');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !employeeId.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Name, Employee ID, and Password are required.');
      return;
    }
    if (password.trim().length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await createEngineer({
        name: name.trim(),
        employeeId: employeeId.trim(),
        email: email.trim() || undefined,
        password: password.trim(),
        grade,
      });
      Alert.alert(
        'Engineer added',
        `Share these sign-in details with ${data.engineer.name}:\n\nEmployee ID: ${data.engineer.employeeId}\nPassword: ${password.trim()}\n\nThey should change this password after their first login (once that feature is available) or you can reset it by re-adding them later.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not create engineer account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.lg }}>
      <Card>
        <Text style={typography.h3}>Engineer Details</Text>
        <Text style={[typography.caption, { marginBottom: spacing.sm }]}>
          Fields marked * are required. The engineer will use Employee ID (or email) + password to log in.
        </Text>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} placeholderTextColor={colors.textMuted} placeholder="e.g. Ramesh Kumar" value={name} onChangeText={setName} />

        <Text style={styles.label}>Employee ID *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. EMP1024"
          placeholderTextColor={colors.textMuted}
          value={employeeId}
          onChangeText={setEmployeeId}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Email (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. ramesh@company.com"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Grade</Text>
        <View style={styles.gradeRow}>
          {GRADES.map((g) => (
            <Text
              key={g}
              onPress={() => setGrade(g)}
              style={[styles.gradeChip, grade === g && styles.gradeChipActive]}
            >
              {g}
            </Text>
          ))}
        </View>

        <Text style={styles.label}>Password *</Text>
        <Text style={[typography.caption, { marginBottom: spacing.xs }]}>
          A temporary password is pre-filled — edit it if you'd like to set your own.
        </Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} autoCapitalize="none" />

        <AppButton title="Add Engineer" onPress={handleCreate} loading={submitting} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  label: { ...typography.body, fontWeight: '700', marginTop: spacing.sm, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
    minHeight: 44,
  },
  gradeRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  gradeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    color: colors.text,
    overflow: 'hidden',
  },
  gradeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.white,
    fontWeight: '700',
  },
});