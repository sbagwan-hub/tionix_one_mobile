import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors, Theme } from '../theme/colors';
import { Typography } from '../theme/typography';
import { moderateScale } from '../utils/responsive';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface PremiumNotificationBellProps {
  unreadCount?: number;
  onPress?: () => void;
  size?: number;
  disabled?: boolean;
}

const PremiumNotificationBell: React.FC<PremiumNotificationBellProps> = ({
  unreadCount = 0,
  onPress,
  size = 50,
  disabled = false,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const animationRef = useRef<number | null>(null);

  const hasUnread = unreadCount > 0;
  const displayCount = unreadCount > 99 ? '99+' : String(unreadCount);

  // Ring animation - gentle swing like a real bell
  useEffect(() => {
    if (hasUnread && !disabled) {
      // Start the ring animation
      rotation.value = withRepeat(
        withSequence(
          withTiming(15, { duration: 150, easing: Easing.inOut(Easing.ease) }),
          withTiming(-15, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withTiming(15, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 150, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // infinite repeat
        false // don't reset
      );
    } else {
      // Stop animation and reset to 0
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 200 });
    }

    return () => {
      cancelAnimation(rotation);
    };
  }, [hasUnread, disabled, rotation]);

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    // Haptic feedback
    if (Platform.OS === 'ios') {
      // iOS haptic feedback
      try {
        const { Haptics } = require('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, silently fail
      }
    } else if (Platform.OS === 'android') {
      // Android haptic feedback
      try {
        const { Haptics } = require('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics not available, silently fail
      }
    }

    onPress?.();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const iconColor = isDark ? Colors.white : Colors.text;
  const backgroundColor = isDark ? '#1E1E1E' : '#F5F5F5';
  const badgeColor = Colors.primary;

  return (
    <AnimatedTouchableOpacity
      style={[
        styles.container,
        {
          width: moderateScale(size),
          height: moderateScale(size),
          backgroundColor: backgroundColor,
        },
        disabled && styles.disabled,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <Ionicons
          name="notifications-outline"
          size={moderateScale(size * 0.5)}
          color={iconColor}
        />
      </Animated.View>

      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <Text style={styles.badgeText}>{displayCount}</Text>
      </View>
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: moderateScale(25),
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: moderateScale(-2),
    right: moderateScale(-2),
    minWidth: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(9),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: moderateScale(4),
    borderWidth: 2,
    borderColor: Colors.white,
  },
  badgeText: {
    ...Typography.label,
    fontSize: moderateScale(10),
    color: Colors.white,
    fontWeight: '700',
    lineHeight: moderateScale(12),
  },
});

export default PremiumNotificationBell;
