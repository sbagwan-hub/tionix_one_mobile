import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import AppCard from '../../../components/AppCard';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'leave' | 'attendance' | 'loan' | 'personal_work' | 'general';
}

const NotificationScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Leave Request Approved',
      message: 'Your leave request from June 20-22 has been approved by your manager.',
      time: '2 hours ago',
      read: false,
      type: 'leave',
    },
    {
      id: '2',
      title: 'Attendance Reminder',
      message: 'Please remember to punch in before 9:15 AM to avoid being marked late.',
      time: '5 hours ago',
      read: false,
      type: 'attendance',
    },
    {
      id: '3',
      title: 'Loan EMI Due',
      message: 'Your next EMI payment of ₹5,000 is due on June 25th.',
      time: '1 day ago',
      read: true,
      type: 'loan',
    },
    {
      id: '4',
      title: 'Personal Work Request',
      message: 'Your personal work request for today has been authorized.',
      time: '2 days ago',
      read: true,
      type: 'personal_work',
    },
    {
      id: '5',
      title: 'System Update',
      message: 'The attendance system will be undergoing maintenance this weekend.',
      time: '3 days ago',
      read: true,
      type: 'general',
    },
  ]);

  const getIconForType = (type: Notification['type']) => {
    switch (type) {
      case 'leave':
        return 'calendar-outline';
      case 'attendance':
        return 'time-outline';
      case 'loan':
        return 'cash-outline';
      case 'personal_work':
        return 'person-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getColorForType = (type: Notification['type']) => {
    switch (type) {
      case 'leave':
        return Colors.primary;
      case 'attendance':
        return Colors.success;
      case 'loan':
        return Colors.warning;
      case 'personal_work':
        return Colors.accent;
      default:
        return Colors.text;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Background Banner */}
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.12)', 'rgba(255, 77, 28, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-outline" size={moderateScale(22)} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: moderateScale(100) + insets.bottom }]}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={moderateScale(64)} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>You're all caught up!</Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map(notification => (
              <TouchableOpacity
                key={notification.id}
                style={[styles.notificationCard, !notification.read && styles.unreadCard]}
                onPress={() => markAsRead(notification.id)}
                activeOpacity={0.7}
              >
                <View style={styles.notificationLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${getColorForType(notification.type)}15` }]}>
                    <Ionicons
                      name={getIconForType(notification.type) as any}
                      size={moderateScale(20)}
                      color={getColorForType(notification.type)}
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={[styles.notificationTitle, !notification.read && styles.unreadTitle]}>
                        {notification.title}
                      </Text>
                      {!notification.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationTime}>{notification.time}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: moderateScale(180),
    overflow: 'hidden',
  },
  bannerGradient: {
    flex: 1,
  },
  bannerBlurOrb1: {
    position: 'absolute',
    top: -moderateScale(40),
    left: -moderateScale(40),
    width: moderateScale(160),
    height: moderateScale(160),
    borderRadius: moderateScale(80),
    backgroundColor: Colors.primary,
    opacity: 0.1,
    filter: 'blur(40px)',
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(20),
    right: -moderateScale(60),
    width: moderateScale(200),
    height: moderateScale(200),
    borderRadius: moderateScale(100),
    backgroundColor: Colors.primary,
    opacity: 0.08,
    filter: 'blur(50px)',
  },
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  backButton: {
    padding: moderateScale(4),
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: moderateScale(20),
    color: Colors.text,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    minWidth: moderateScale(24),
    alignItems: 'center',
  },
  unreadCount: {
    ...Typography.label,
    fontSize: moderateScale(12),
    color: Colors.white,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: moderateScale(80),
  },
  emptyTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
    marginTop: Theme.spacing.md,
  },
  emptySubtitle: {
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.textMuted,
    marginTop: Theme.spacing.xs,
  },
  notificationsList: {
    gap: Theme.spacing.sm,
  },
  notificationCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.md,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.sm,
  },
  unreadCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Theme.spacing.md,
  },
  iconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: moderateScale(4),
  },
  notificationTitle: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    color: Colors.text,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    backgroundColor: Colors.primary,
    marginLeft: Theme.spacing.xs,
  },
  notificationMessage: {
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    marginBottom: moderateScale(4),
  },
  notificationTime: {
    ...Typography.caption,
    fontSize: moderateScale(12),
    color: Colors.textMuted,
  },
});

export default NotificationScreen;
