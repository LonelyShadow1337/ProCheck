// Таб-навигатор старшего инспектора

import { Tabs } from 'expo-router';
import React from 'react';

export default function SeniorTabsLayout() {
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
          title: 'Шаблоны',
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: 'Утверждение',
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


