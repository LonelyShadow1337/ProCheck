// Экран переписки в конкретном чате

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MenuAction, MenuModal } from '@/components/ui/menu-modal';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useAppData } from '@/contexts/AppDataContext';
import { Chat, User } from '@/types/models';

const getChatTitle = (chat: Chat | undefined, currentUser: User | undefined, participants: User[]) => {
  if (!chat) return 'Чат';
  if (chat.title) return chat.title;
  const others = participants.filter((user) => user.id !== currentUser?.id);
  if (others.length === 1) return others[0]?.fullName ?? 'Чат';
  return others.map((user) => user.fullName).join(', ');
};

export default function ChatDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const chatId = params.id;
  const { data, auth, addChatMessage, refresh, deleteChat } = useAppData();
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messageText, setMessageText] = useState('');

  const currentUser = data.users.find((user) => user.id === auth.currentUserId);
  const chat = data.chats.find((item) => item.id === chatId);
  const participants = useMemo(
    () =>
      chat
        ? chat.participantIds
            .map((participantId) => data.users.find((user) => user.id === participantId))
            .filter(Boolean)
        : [],
    [chat, data.users],
  ) as User[];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleSend = async () => {
    if (!chat || !currentUser) return;
    if (!messageText.trim()) return;
    await addChatMessage(chat.id, {
      authorId: currentUser.id,
      text: messageText.trim(),
    });
    setMessageText('');
  };

  const handleDelete = async (scope: 'self' | 'all') => {
    if (!chat || !currentUser) return;
    await deleteChat(chat.id, currentUser.id, scope);
    router.replace('/chat');
  };

  const menuActions: MenuAction[] = [
    { id: 'refresh', label: 'Обновить', onPress: handleRefresh },
    { id: 'delete-self', label: 'Удалить чат у меня', onPress: () => handleDelete('self') },
    ...(chat && chat.participantIds.length <= 2
      ? [{ id: 'delete-all', label: 'Удалить чат у всех', onPress: () => handleDelete('all') } satisfies MenuAction]
      : []),
    { id: 'back', label: 'К списку чатов', onPress: () => router.back() },
  ];

  if (!chat) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScreenHeader title="Чат" onMenuPress={() => setMenuVisible(true)} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Чат не найден</Text>
        </View>
        <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} actions={menuActions} title="Действия" />
      </SafeAreaView>
    );
  }

  const title = getChatTitle(chat, currentUser, participants);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title={title} subtitle="Сообщения" onMenuPress={() => setMenuVisible(true)} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}>
        <FlatList
          data={chat.messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={({ item }) => {
            const isCurrent = item.authorId === currentUser?.id;
            const author = data.users.find((user) => user.id === item.authorId);
            return (
              <View style={[styles.messageBubble, isCurrent ? styles.messageBubbleRight : styles.messageBubbleLeft]}>
                <Text style={[styles.messageAuthor, isCurrent && styles.messageAuthorSelf]}>
                  {author?.fullName ?? 'Участник'}
                </Text>
                <Text style={[styles.messageText, isCurrent && styles.messageTextSelf]}>{item.text}</Text>
                <Text style={[styles.messageTime, isCurrent && styles.messageTimeSelf]}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
            );
          }}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Введите сообщение"
            value={messageText}
            onChangeText={setMessageText}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendButtonText}>Отпр.</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} actions={menuActions} title="Действия" />
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
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  messageBubbleLeft: {
    alignSelf: 'flex-start',
    backgroundColor: '#e2e8f0',
  },
  messageBubbleRight: {
    alignSelf: 'flex-end',
    backgroundColor: '#3b82f6',
  },
  messageAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  messageAuthorSelf: {
    color: '#f8fafc',
  },
  messageText: {
    fontSize: 14,
    color: '#0f172a',
    marginTop: 4,
  },
  messageTextSelf: {
    color: '#f8fafc',
  },
  messageTime: {
    fontSize: 11,
    color: '#475569',
    marginTop: 6,
    textAlign: 'right',
  },
  messageTimeSelf: {
    color: '#e2e8f0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#f8fafc',
  },
  sendButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
});


