// Универсальный заголовок экрана с кнопкой меню (три вертикальные точки)

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onMenuPress?: () => void;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, onMenuPress }) => (
  <View style={styles.container}>
    <View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
      <Text style={styles.menuText}>⋮</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2933',
  },
  subtitle: {
    fontSize: 14,
    color: '#52606d',
    marginTop: 4,
  },
  menuButton: {
    padding: 8,
  },
  menuText: {
    fontSize: 24,
    color: '#1f2933',
  },
});


