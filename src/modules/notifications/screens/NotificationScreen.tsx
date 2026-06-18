import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  timeRange?: string; // For shift assignments
  read: boolean;
  type: 'shift' | 'reminder' | 'leave' | 'system';
}

const NotificationScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'UPDATES' | 'ALERTS'>('ALL');
  
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'New Shift Assigned',
      message: "You've been assigned to the Downtown Logistics Hub shift starting tomorrow at 08:00 AM.",
      timeRange: 'Oct 24, 08:00 - 17:00',
      time: '2m ago',
      read: false,
      type: 'shift',
    },
    {
      id: '2',
      title: 'Clock-in Reminder',
      message: 'Upcoming shift starts in 30 minutes. Please ensure you are within the geofenced area.',
      time: '30m ago',
      read: false,
      type: 'reminder',
    },
    {
      id: '3',
      title: 'Leave Request Approved',
      message: 'Your vacation request for Nov 12th to Nov 15th has been approved by the management team.',
      time: '1h ago',
      read: true,
      type: 'leave',
    },
    {
      id: '4',
      title: 'System Update',
      message: 'The Kinetic platform has been upgraded to v4.2. Discover new real-time tracking features in your dashboard.',
      time: '4h ago',
      read: true,
      type: 'system',
    },
  ]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'UNREAD') return !n.read;
      if (activeFilter === 'UPDATES') return n.type === 'system' || n.type === 'leave';
      if (activeFilter === 'ALERTS') return n.type === 'reminder' || n.type === 'shift';
      return true;
    });
  }, [notifications, activeFilter]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    Alert.alert('Success', 'All notifications marked as read.');
  };

  const toggleReadStatus = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const getStyleForType = (type: Notification['type']) => {
    switch (type) {
      case 'shift':
        return {
          icon: 'calendar-outline',
          iconColor: '#EF4444',
          bgColor: '#FEF2F2',
          borderColor: '#EF4444',
        };
      case 'reminder':
        return {
          icon: 'time-outline',
          iconColor: Colors.primary,
          bgColor: '#FFF5F2',
          borderColor: Colors.primary,
        };
      case 'leave':
        return {
          icon: 'checkmark-circle-outline',
          iconColor: Colors.success,
          bgColor: '#F0FDF4',
          borderColor: Colors.success,
        };
      case 'system':
        return {
          icon: 'flash-outline',
          iconColor: '#3B82F6',
          bgColor: '#EFF6FF',
          borderColor: '#3B82F6',
        };
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Categories Filter Tabs Row */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['ALL', 'UNREAD', 'UPDATES', 'ALERTS'] as const).map(tab => {
            const isActive = activeFilter === tab;
            const label = tab === 'ALL' ? 'All' : tab === 'UNREAD' ? 'Unread' : tab === 'UPDATES' ? 'Updates' : 'Alerts';
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveFilter(tab)}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Scrollable Notifications List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + moderateScale(20) }]}
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-off-outline" size={moderateScale(48)} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>You have no notifications matching this category.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredNotifications.map(item => {
              const config = getStyleForType(item.type);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.notificationCard,
                    { borderLeftColor: config.borderColor },
                    !item.read && styles.notificationCardUnread,
                  ]}
                  onPress={() => toggleReadStatus(item.id)}
                  activeOpacity={0.85}
                >
                  {/* Left Icon Block */}
                  <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
                    <Ionicons name={config.icon as any} size={moderateScale(18)} color={config.iconColor} />
                  </View>

                  {/* Body Content Block */}
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, !item.read && styles.cardTitleUnread]}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardMessage}>{item.message}</Text>

                    {item.timeRange && (
                      <View style={styles.timeRangeRow}>
                        <Ionicons name="time-outline" size={moderateScale(12)} color="#EF4444" />
                        <Text style={styles.timeRangeText}>{item.timeRange}</Text>
                      </View>
                    )}
                  </View>

                  {/* Right relative time and unread dot */}
                  <View style={styles.cardRight}>
                    <Text style={styles.relativeTimeText}>{item.time}</Text>
                    {!item.read && <View style={[styles.cardUnreadDot, { backgroundColor: config.iconColor }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}


      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: 'transparent',
    paddingBottom: Theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(10),
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Theme.shadow.sm,
  },
  headerTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  markAllReadTextButton: {
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  markAllReadText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    color: Colors.primary,
  },
  filterWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterScroll: {
    paddingHorizontal: Theme.spacing.lg,
    gap: moderateScale(8),
  },
  filterPill: {
    paddingHorizontal: moderateScale(18),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(20),
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: '#FF4D1C',
  },
  filterPillText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(13),
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Outfit_700Bold',
  },
  contentContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  listContainer: {
    gap: Theme.spacing.sm,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderLeftWidth: 4,
    ...Theme.shadow.sm,
    shadowColor: 'rgba(15, 23, 42, 0.04)',
  },
  notificationCardUnread: {
    ...Theme.shadow.md,
    shadowColor: 'rgba(255, 77, 28, 0.05)',
  },
  iconContainer: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(12),
  },
  cardBody: {
    flex: 1,
    gap: moderateScale(4),
  },
  cardTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: '#0F172A',
  },
  cardTitleUnread: {
    color: '#0F172A',
  },
  cardMessage: {
    fontFamily: 'Outfit_400Regular',
    fontSize: moderateScale(12),
    color: '#64748B',
    lineHeight: moderateScale(17),
  },
  timeRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    marginTop: moderateScale(4),
  },
  timeRangeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(10),
    color: '#EF4444',
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingLeft: moderateScale(8),
    height: '100%',
    minHeight: moderateScale(38),
  },
  relativeTimeText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(10),
    color: '#94A3B8',
  },
  cardUnreadDot: {
    width: moderateScale(7),
    height: moderateScale(7),
    borderRadius: moderateScale(3.5),
    marginTop: moderateScale(8),
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    paddingVertical: moderateScale(60),
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(8),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Theme.shadow.sm,
  },
  emptyTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: '#0F172A',
  },
  emptySubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(12),
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: moderateScale(40),
  },
  proCard: {
    borderRadius: moderateScale(20),
    overflow: 'hidden',
    marginTop: moderateScale(8),
    ...Theme.shadow.floating,
    shadowColor: '#FF4D1C',
    shadowOpacity: 0.15,
  },
  proCardImage: {
    borderRadius: moderateScale(20),
  },
  proGradient: {
    padding: Theme.spacing.lg,
    gap: moderateScale(10),
  },
  proHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  proBadge: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTitle: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: moderateScale(18),
    color: '#FFFFFF',
  },
  proDescription: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(13),
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: moderateScale(18),
    marginRight: moderateScale(30),
  },
  proButton: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: moderateScale(20),
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(20),
    marginTop: moderateScale(6),
  },
  proButtonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    color: '#FF4D1C',
  },
});

export default NotificationScreen;
