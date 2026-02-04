// Таб-навигатор для роли заказчика

import { Tabs } from 'expo-router';
import { Image } from 'react-native';

const iconSize = 24;

export default function CustomerTabsLayout() {
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
          title: 'Проверки',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../images/inspection.png')}
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
        name="create"
        options={{
          title: 'Сделать проверку',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../images/inspectionplus.png')}
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
        name="reports"
        options={{
          title: 'Отчёты',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('../../images/report.png')}
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
    </Tabs>
  );
}

