import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Brand } from '@/constants/brand';

function icon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} size={size} color={color as string} />
  );
}

export default function AppTabs() {
  const { user, loading } = useAuth();
  if (!loading && !user) return <Redirect href="/(auth)/login" />;
  const worker = user?.role === 'worker';
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Brand.indigo950 },
        headerTintColor: '#FFFFFF',
        headerTitle: 'Co-LabConnect',
        tabBarActiveTintColor: Brand.indigo600,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen
        name="services"
        options={{ title: worker ? 'Jobs' : 'Services', tabBarIcon: icon(worker ? 'briefcase-outline' : 'grid-outline') }}
      />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen
        name="notifications"
        options={{ title: 'Alerts', tabBarIcon: icon('notifications-outline') }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person-outline') }} />
      <Tabs.Screen name="booking/[id]" options={{ href: null, title: 'Details' }} />
      <Tabs.Screen name="request-new" options={{ href: null, title: 'New Request' }} />
      <Tabs.Screen name="workforce" options={{ href: null }} />
      <Tabs.Screen name="workforce-new" options={{ href: null }} />
      <Tabs.Screen name="workforce/[id]" options={{ href: null }} />
      <Tabs.Screen name="disputes" options={{ href: null, title: 'Disputes' }} />
    </Tabs>
  );
}
