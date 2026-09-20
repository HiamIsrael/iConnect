import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import type { RootStackParamList, TabParamList } from './types';

import HomeScreen from '../screens/HomeScreen';
import MusiciansScreen from '../screens/MusiciansScreen';
import GigsScreen from '../screens/GigsScreen';
import CommunityScreen from '../screens/CommunityScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import MusicianProfileScreen from '../screens/MusicianProfileScreen';
import GigDetailScreen from '../screens/GigDetailScreen';
import BandsScreen from '../screens/BandsScreen';
import BandDetailScreen from '../screens/BandDetailScreen';
import VenuesScreen from '../screens/VenuesScreen';
import VenueDetailScreen from '../screens/VenueDetailScreen';
import MessagesScreen from '../screens/MessagesScreen';
import AvailabilityScreen from '../screens/AvailabilityScreen';
import EpkScreen from '../screens/EpkScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AdminScreen from '../screens/AdminScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const tabIcon = (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: styles.tabLabel,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="Musicians" component={MusiciansScreen} options={{ tabBarIcon: tabIcon('people') }} />
      <Tab.Screen name="Gigs" component={GigsScreen} options={{ tabBarIcon: tabIcon('calendar') }} />
      <Tab.Screen name="Community" component={CommunityScreen} options={{ tabBarIcon: tabIcon('chatbubbles') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: tabIcon('person') }} />
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Text style={styles.brand}>iConnect</Text>
      <ActivityIndicator color={colors.brand} size="large" style={{ marginTop: spacing.lg }} />
    </View>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {user ? (
        <React.Fragment>
          <RootStack.Screen name="Tabs" component={Tabs} />
          <RootStack.Screen name="MusicianProfile" component={MusicianProfileScreen} />
          <RootStack.Screen name="GigDetail" component={GigDetailScreen} />
          <RootStack.Screen name="Bands" component={BandsScreen} />
          <RootStack.Screen name="BandDetail" component={BandDetailScreen} />
          <RootStack.Screen name="Venues" component={VenuesScreen} />
          <RootStack.Screen name="VenueDetail" component={VenueDetailScreen} />
          <RootStack.Screen name="Messages" component={MessagesScreen} />
          <RootStack.Screen name="Availability" component={AvailabilityScreen} />
          <RootStack.Screen name="Epk" component={EpkScreen} />
          <RootStack.Screen name="Notifications" component={NotificationsScreen} />
          <RootStack.Screen name="Admin" component={AdminScreen} />
        </React.Fragment>
      ) : (
        <React.Fragment>
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Signup" component={SignupScreen} />
        </React.Fragment>
      )}
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    height: 62,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
});
