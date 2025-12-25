// Таб-навигатор инспектора

import { Tabs } from 'expo-router';
import React from 'react';

export default function InspectorTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
        tabBarStyle: { paddingVertical: 8 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Назначенные',
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Отчёты',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Чаты',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
        }}
      />
    </Tabs>
  );
}


