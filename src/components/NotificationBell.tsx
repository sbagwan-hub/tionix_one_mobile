import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../theme/colors';
import { moderateScale } from '../utils/responsive';

interface NotificationBellProps {
  notificationCount?: number;
  onPress?: () => void;
  size?: number;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  notificationCount = 0,
  onPress,
  size = 24,
}) => {
  const showBadge = notificationCount > 0;
  const displayCount = notificationCount > 99 ? '99+' : String(notificationCount);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons
        name="notifications-outline"
        size={moderateScale(size)}
        color={Colors.text}
      />
      {showBadge && (
        <View style={styles.badge}>
          <View style={styles.badgeInner}>
            <View style={styles.badgeDot} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: moderateScale(8),
  },
  badge: {
    position: 'absolute',
    top: moderateScale(4),
    right: moderateScale(4),
    backgroundColor: Colors.primary,
    borderRadius: moderateScale(10),
    minWidth: moderateScale(20),
    height: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  badgeInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDot: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    backgroundColor: Colors.white,
  },
});

export default NotificationBell;
