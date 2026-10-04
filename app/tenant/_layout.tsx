import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useT } from '../../src/lib/i18n';
import { colors } from '../../src/lib/theme';

export default function TenantTabs() {
  const { t } = useT();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        headerTitleStyle: { fontWeight: '700', color: colors.ink },
        headerStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('explore'), tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="requests"
        options={{ title: t('requests'), tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('profile'), tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
