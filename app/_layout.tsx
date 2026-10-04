import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/lib/auth';
import { LangProvider } from '../src/lib/i18n';
import { colors } from '../src/lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LangProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerTintColor: colors.brand,
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: { fontWeight: '700', color: colors.ink },
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
            <Stack.Screen name="sign-up" options={{ title: '' }} />
            <Stack.Screen name="tenant" options={{ headerShown: false }} />
            <Stack.Screen name="owner" options={{ headerShown: false }} />
            <Stack.Screen name="broker" options={{ headerShown: false }} />
            <Stack.Screen name="listing/[id]" options={{ title: '' }} />
          </Stack>
        </AuthProvider>
      </LangProvider>
    </SafeAreaProvider>
  );
}
