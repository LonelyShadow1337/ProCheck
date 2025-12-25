// Модальное окно с действиями текущего экрана (фильтры, сортировки, создание и т.п.)

import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export interface MenuAction {
  id: string;
  label: string;
  onPress: () => void;
}

interface MenuModalProps {
  visible: boolean;
  title?: string;
  actions: MenuAction[];
  onClose: () => void;
}

export const MenuModal: React.FC<MenuModalProps> = ({ visible, actions, onClose, title }) => (
  <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
    <Pressable style={styles.overlay} onPress={onClose}>
      <View style={styles.content}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {actions.map((action) => (
          <Pressable
            key={action.id}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            onPress={() => {
              onClose();
              action.onPress();
            }}>
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  content: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2933',
    marginBottom: 12,
  },
  action: {
    paddingVertical: 12,
  },
  actionPressed: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 15,
    color: '#1f2933',
  },
});


