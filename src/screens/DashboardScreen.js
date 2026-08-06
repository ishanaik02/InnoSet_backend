import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Alert, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import StatBox from '../components/StatBox';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../services/tripService';
import { getCurrentTrackingState } from '../services/backgroundLocationService';
import { colors, spacing, typography, radius } from '../theme/theme';

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalTrips: 0,
    distanceCoveredKm: 0,
    pendingClaims: 0,
    reimbursementStatus: 'Up to date',
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (e) {
      // Backend not reachable yet in dev — keep default/mock values
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const confirmLogout = async () => {
    const tracking = await getCurrentTrackingState();
    if (tracking) {
      Alert.alert(
        'Trip in progress',
        'You still have a trip being tracked. Logging out now will stop location tracking for it. End the trip first if possible, or continue if you\u2019re sure.',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Log Out Anyway', style: 'destructive', onPress: logout },
        ]
      );
      return;
    }
    Alert.alert('Log out?', 'You can continue working by choosing Stay.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={typography.caption}>Welcome back,</Text>
          <Text style={typography.h1}>{user?.name || 'Engineer'}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Log out" onPress={confirmLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      <Card>
        <AppButton
          title="+  Start New Trip"
          onPress={() => navigation.navigate('NewTrip')}
        />
      </Card>

      <View style={styles.statsRow}>
        <StatBox label="Trips Completed" value={stats.totalTrips} />
        <StatBox label="Distance (km)" value={stats.distanceCoveredKm} />
        <StatBox label="Pending Claims" value={stats.pendingClaims} />
      </View>

      <Card>
        <Text style={typography.h3}>Reimbursement Status</Text>
        <Text style={styles.reimbursement}>{stats.reimbursementStatus}</Text>
      </Card>

      <Card style={styles.linkCard} onTouchEnd={() => navigation.navigate('PastTrips')}>
        <AppButton
          title="View Past Trips"
          variant="outline"
          onPress={() => navigation.navigate('PastTrips')}
        />
      </Card>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm, marginTop: spacing.sm },
  logoutButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.pill },
  logoutText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', marginTop: spacing.sm },
  reimbursement: { ...typography.body, color: colors.success, marginTop: spacing.xs, fontWeight: '600' },
  linkCard: { paddingVertical: spacing.xs },
});
