import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { TripProvider } from '../context/TripContext';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import NewTripScreen from '../screens/NewTripScreen';
import RoundTripScreen from '../screens/RoundTripScreen';
import StayTripScreen from '../screens/StayTripScreen';
import TripSummaryScreen from '../screens/TripSummaryScreen';
import PastTripsScreen from '../screens/PastTripsScreen';
import EngineerTripDetailScreen from '../screens/EngineerTripDetailScreen';

import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminTripsScreen from '../screens/AdminTripsScreen';
import AdminTripDetailScreen from '../screens/AdminTripDetailScreen';
import AdminEngineersScreen from '../screens/AdminEngineersScreen';
import AdminAddEngineerScreen from '../screens/AdminAddEngineerScreen';

import { colors } from '../theme/theme';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '700' },
};

function EngineerStack() {
  return (
    <TripProvider>
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
        <Stack.Screen name="NewTrip" component={NewTripScreen} options={{ title: 'New Trip' }} />
        <Stack.Screen name="RoundTrip" component={RoundTripScreen} options={{ title: 'Round Trip' }} />
        <Stack.Screen name="StayTrip" component={StayTripScreen} options={{ title: 'Stay Trip' }} />
        <Stack.Screen name="TripSummary" component={TripSummaryScreen} options={{ title: 'Trip Summary' }} />
        <Stack.Screen name="PastTrips" component={PastTripsScreen} options={{ title: 'Past Trips' }} />
        <Stack.Screen name="EngineerTripDetail" component={EngineerTripDetailScreen} options={{ title: 'Trip Details' }} />
      </Stack.Navigator>
    </TripProvider>
  );
}

// Admin gets its own, separate stack in the same app — no engineer-only
// trip-creation/GPS screens are reachable from here.
function AdminStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="AdminTrips" component={AdminTripsScreen} options={{ title: 'All Trips' }} />
      <Stack.Screen name="AdminTripDetail" component={AdminTripDetailScreen} options={{ title: 'Trip Detail' }} />
      <Stack.Screen name="AdminEngineers" component={AdminEngineersScreen} options={{ title: 'Engineers' }} />
      <Stack.Screen name="AdminAddEngineer" component={AdminAddEngineerScreen} options={{ title: 'Add Engineer' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        user.role === 'admin' ? <AdminStack /> : <EngineerStack />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
