// Разделительная линия для списков и контента

import React from 'react';
import { StyleSheet, View } from 'react-native';

export const Separator: React.FC = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  separator: {
    height: 1,
    backgroundColor: '#d9e2ec',
    marginVertical: 8,
  },
});


