// Таб-навигатор для роли администратора

import { Tabs } from 'expo-router';

const iconSize = 24;

export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
        tabBarStyle: { paddingVertical: 6, height: 64 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'БД',
        }}
      />
      <Tabs.Screen
        name="account-requests"
        options={{
          title: 'Запросы',
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
      <Tabs.Screen
        name="users"
        options={{
          href: null, // Скрываем из табов, но оставляем доступным по прямой ссылке
        }}
      />
      <Tabs.Screen
        name="inspections"
        options={{
          href: null, // Скрываем из табов, доступен через меню БД
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          href: null, // Скрываем из табов, доступен через меню БД
        }}
      />
      <Tabs.Screen
        name="templates"
        options={{
          href: null, // Скрываем из табов, доступен через меню БД
        }}
      />
    </Tabs>
  );
}


