// Универсальный заголовок экрана с кнопкой "назад" (иконка) и кнопкой меню (три вертикальные точки)

import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /**
   * Обработчик нажатия на кнопку "назад".
   * Если не передан, кнопка не отображается.
   */
  onBackPress?: () => void;
  /**
   * Обработчик нажатия на меню (три точки).
   * Если не передан, кнопка не отображается.
   */
  onMenuPress?: () => void;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onBackPress,
  onMenuPress,
}) => (
  <View style={styles.container}>
    <View style={styles.leftSection}>
      {onBackPress && (
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Image
            source={require('../../images/back.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
    {onMenuPress && (
      <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
        <Text style={styles.menuText}>⋮</Text>
      </TouchableOpacity>
    )}
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
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 20,
    height: 20,
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


