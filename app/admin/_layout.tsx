// Таб-навигатор для роли администратора

import { Tabs } from 'expo-router';
import { Image } from 'react-native';

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
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../images/bd.png')}
              style={{
                width: iconSize,
                height: iconSize,
                tintColor: focused ? '#1d4ed8' : '#94a3b8',
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account-requests"
        options={{
          title: 'Запросы',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../images/templates.png')}
              style={{
                width: iconSize,
                height: iconSize,
                tintColor: focused ? '#1d4ed8' : '#94a3b8',
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Чаты',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../images/chat.png')}
              style={{
                width: iconSize,
                height: iconSize,
                tintColor: focused ? '#1d4ed8' : '#94a3b8',
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../images/profile.png')}
              style={{
                width: iconSize,
                height: iconSize,
                tintColor: focused ? '#1d4ed8' : '#94a3b8',
              }}
              resizeMode="contain"
            />
          ),
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
      <Tabs.Screen
        name="database-managment"
        options={{
          href: null, // Скрываем из табов, доступен через меню БД
        }}
      />
    </Tabs>
  );
}


