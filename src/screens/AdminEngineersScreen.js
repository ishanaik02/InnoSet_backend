import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import AppButton from '../components/AppButton';
import { getEngineers } from '../services/adminService';
import { colors, spacing, typography, radius } from '../theme/theme';

export default function AdminEngineersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        try {
          const data = await getEngineers();
          if (active) setEngineers(data.engineers || []);
        } catch (e) {
          if (active) setEngineers([]);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (engineers.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={typography.body}>No engineers registered yet.</Text>
        <AppButton
          title="+ Add Engineer"
          onPress={() => navigation.navigate('AdminAddEngineer')}
          style={{ marginTop: spacing.md, alignSelf: 'stretch' }}
        />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={engineers}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.lg }}
      ListHeaderComponent={
        <AppButton
          title="+ Add Engineer"
          onPress={() => navigation.navigate('AdminAddEngineer')}
          style={{ marginBottom: spacing.md }}
        />
      }
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => navigation.navigate('AdminTrips', { engineerId: item.id })}>
          <Card>
            <View style={styles.rowBetween}>
              <Text style={typography.h3}>{item.name}</Text>
              {item.pendingApprovals > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.pendingApprovals} pending</Text>
                </View>
              )}
            </View>
            <Text style={typography.caption}>{item.employeeId} · {item.email}</Text>
            <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
              <Text style={typography.body}>{item.totalTrips} trips · {item.distanceKm} km</Text>
              <Text style={styles.amount}>₹{item.totalReimbursed.toFixed(2)}</Text>
            </View>
            {item.totalReceipts > 0 && (
              <View style={[styles.rowBetween, { marginTop: spacing.xs }]}>
                <Text style={typography.caption}>📎 {item.totalReceipts} receipt{item.totalReceipts === 1 ? '' : 's'} uploaded</Text>
                {item.pendingReceipts > 0 && (
                  <Text style={[typography.caption, { color: colors.warning, fontWeight: '700' }]}>
                    {item.pendingReceipts} awaiting review
                  </Text>
                )}
              </View>
            )}
          </Card>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.warning },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  amount: { fontWeight: '700', color: colors.primary },
});
