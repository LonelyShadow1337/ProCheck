// Экран авторизации: доступен неавторизованным пользователям

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
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

const roleTitles: Record<UserRole, string> = {
  admin: 'Администратор',
  customer: 'Заказчик',
  seniorInspector: 'Старший инспектор',
  inspector: 'Инспектор',
};

export default function LoginScreen() {
  const router = useRouter();
  const { login, createAccountRequest } = useAppData();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [requestData, setRequestData] = useState({
    username: '',
    password: '',
    role: 'inspector' as UserRole,
    purpose: '',
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const user = await login(username, password);
    setLoading(false);

    if (!user) {
      Alert.alert('Ошибка входа', 'Пользователь не найден или пароль указан неверно');
      return;
    }

    const path = getRoleHomePath(user.role);
    router.replace(path);
  };

  const handleSubmitRequest = async () => {
    if (!requestData.username.trim() || !requestData.password.trim() || !requestData.purpose.trim()) {
      Alert.alert('Заполните все поля', 'Необходимо указать логин, пароль и описать цель создания аккаунта');
      return;
    }

    setSubmittingRequest(true);
    try {
      await createAccountRequest({
        username: requestData.username.trim(),
        password: requestData.password,
        role: requestData.role,
        purpose: requestData.purpose.trim(),
      });
      Alert.alert('Заявка отправлена', 'Ваш запрос на создание аккаунта отправлен администратору на рассмотрение');
      setRequestModalVisible(false);
      setRequestData({
        username: '',
        password: '',
        role: 'inspector',
        purpose: '',
      });
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось отправить заявку');
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <View style={styles.header}>
          <Text style={styles.title}>ProCheck</Text>
          <Text style={styles.subtitle}>Войдите, чтобы продолжить работу с проверками</Text>
        </View>
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Логин</Text>
            <TextInput
              style={styles.input}
              placeholder="Введите логин"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              returnKeyType="next"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Пароль</Text>
            <TextInput
              style={styles.input}
              placeholder="Введите пароль"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
            />
          </View>
          <TouchableOpacity style={[styles.submitButton, loading && styles.disabled]} disabled={loading} onPress={handleSubmit}>
            <Text style={styles.submitText}>{loading ? 'Проверка...' : 'Войти'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.requestButton} onPress={() => setRequestModalVisible(true)}>
            <Text style={styles.requestButtonText}>Подать заявку на создание аккаунта</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={requestModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRequestModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <Pressable style={styles.modalOverlay} onPress={() => setRequestModalVisible(false)}>
            <Pressable style={styles.modalContainer} onPress={() => {}}>
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Заявка на создание аккаунта</Text>
              <Text style={styles.modalSubtitle}>Заполните форму для подачи заявки администратору</Text>
              
              <View style={styles.field}>
                <Text style={styles.label}>Желаемое имя пользователя (логин)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Введите логин"
                  autoCapitalize="none"
                  value={requestData.username}
                  onChangeText={(value) => setRequestData((prev) => ({ ...prev, username: value }))}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Пароль</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Введите пароль"
                  secureTextEntry
                  value={requestData.password}
                  onChangeText={(value) => setRequestData((prev) => ({ ...prev, password: value }))}
                />
                <Text style={styles.hintText}>Администратор не увидит ваш пароль</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Роль</Text>
                <View style={styles.roleSelector}>
                  {(Object.keys(roleTitles) as UserRole[]).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleButton,
                        requestData.role === role && styles.roleButtonActive,
                      ]}
                      onPress={() => setRequestData((prev) => ({ ...prev, role }))}>
                      <Text
                        style={[
                          styles.roleButtonText,
                          requestData.role === role && styles.roleButtonTextActive,
                        ]}>
                        {roleTitles[role]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Цель создания аккаунта</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Опишите, зачем вам нужен аккаунт этого типа"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={requestData.purpose}
                  onChangeText={(value) => setRequestData((prev) => ({ ...prev, purpose: value }))}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setRequestModalVisible(false)}>
                  <Text style={styles.modalCancelText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmit, submittingRequest && styles.disabled]}
                  onPress={handleSubmitRequest}
                  disabled={submittingRequest}>
                  <Text style={styles.modalSubmitText}>
                    {submittingRequest ? 'Отправка...' : 'Отправить заявку'}
                  </Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1f2933',
  },
  subtitle: {
    fontSize: 16,
    color: '#52606d',
    marginTop: 12,
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#ffffff',
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#3e4c59',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d9e2ec',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#102a43',
  },
  submitButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  requestButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  requestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  modalScroll: {
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2933',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  hintText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  roleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  roleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#e2e8f0',
  },
  roleButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#1d4ed8',
  },
  roleButtonText: {
    fontSize: 13,
    color: '#1f2933',
    fontWeight: '500',
  },
  roleButtonTextActive: {
    color: '#ffffff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    fontSize: 15,
    color: '#64748b',
  },
  modalSubmit: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1d4ed8',
  },
  modalSubmitText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
});


