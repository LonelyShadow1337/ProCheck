// Стартовый экран загрузки: показывает краткую информацию о приложении ProCheck

import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAppData } from '@/contexts/AppDataContext';
import { UserRole } from '@/types/models';

const getRoleHomePath = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'customer':
      return '/customer';
    case 'seniorInspector':
      return '/senior';
    case 'inspector':
      return '/inspector';
    default:
      return '/login';
  }
};

export default function SplashScreen() {
  const router = useRouter();
  const { auth, data, loading } = useAppData();

  useEffect(() => {
    if (loading) return;

    const timeout = setTimeout(() => {
      const currentUser = data.users.find((user) => user.id === auth.currentUserId);
      if (currentUser) {
        router.replace(getRoleHomePath(currentUser.role));
      } else {
        router.replace('/login');
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [auth.currentUserId, data.users, loading, router]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>ProCheck</Text>
        <Text style={styles.subtitle}>Мобильное приложение для удобного проведения проверок</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Основные возможности:</Text>
          <Text style={styles.infoLine}>• Управление проверками по шаблонам и без них</Text>
          <Text style={styles.infoLine}>• Разграничение ролей: администратор, заказчик, инспекторы</Text>
          <Text style={styles.infoLine}>• Локальное хранение данных и офлайн-доступ</Text>
          <Text style={styles.infoLine}>• Автоматическая генерация отчётов</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Загрузка данных...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1f2933',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#3e4c59',
    marginBottom: 24,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#ffffff',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1f2933',
  },
  infoLine: {
    fontSize: 15,
    color: '#52606d',
    marginBottom: 6,
  },
  footer: {
    paddingBottom: 32,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#52606d',
  },
});


