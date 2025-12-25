import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppDataProvider } from '@/contexts/AppDataContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <AppDataProvider>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="admin" />
            <Stack.Screen name="customer" />
            <Stack.Screen name="senior" />
            <Stack.Screen name="inspector" />
            <Stack.Screen name="chat" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
      </AppDataProvider>
    </SafeAreaProvider>
  );
}
