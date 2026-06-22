import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from '../utils/responsive';
import { Colors, Theme } from '../theme/colors';
import { Typography } from '../theme/typography';

type AppBarProps = {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: ReactNode;
  style?: StyleProp<ViewStyle>;
  transparent?: boolean;
};

const AppBar = ({
  title,
  showBackButton = false,
  onBackPress,
  rightComponent,
  style,
  transparent = false,
}: AppBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }, transparent && styles.transparent, style]}>
      <View style={styles.content}>
        <View style={styles.left}>
          {showBackButton && (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={onBackPress || (() => {})} 
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={moderateScale(22)} color={Colors.text} />
            </TouchableOpacity>
          )}
          {title && <Text style={styles.title}>{title}</Text>}
        </View>
        {rightComponent && <View style={styles.right}>{rightComponent}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: moderateScale(44),
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Theme.spacing.md,
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(10),
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AppBar;
