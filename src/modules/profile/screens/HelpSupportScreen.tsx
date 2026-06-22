import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppBar from '../../../components/AppBar';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import AppCard from '../../../components/AppCard';
import Toast from 'react-native-toast-message';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'attendance' | 'leave' | 'general';
}

const faqs: FAQItem[] = [
  {
    id: '1',
    question: 'How do I punch-in/punch-out?',
    answer: 'Navigate to the Home screen, ensure your Location Services and internet connection are active. Press and hold the circular "Punch IN" or "Check OUT" button. The app will verify your location context and record the attendance stamp.',
    category: 'attendance',
  },
  {
    id: '2',
    question: 'Punch-in fails with location errors, what should I do?',
    answer: 'The system validates your distance from designated office locations. Ensure your high-accuracy GPS setting is enabled, you are physically within the office geofence range, and you have granted background location permissions to the app.',
    category: 'attendance',
  },
  {
    id: '3',
    question: 'How do I request a Leave?',
    answer: 'Go to Profile > My Leaves > Apply Leave. Choose your leave type (Annual, Casual, Sick, etc.), date range, and provide a brief description. Once submitted, your request is routed to your Reporting Manager for authorization.',
    category: 'leave',
  },
  {
    id: '4',
    question: 'Is my live location tracked continuously?',
    answer: 'Live location tracking is active only during official shift timings and while you are clocked in. It automatically stops tracking when you check out or when your shift finishes to respect user privacy.',
    category: 'general',
  },
  {
    id: '5',
    question: 'How can I update my emergency contact details?',
    answer: 'Go to Profile > Personal Information. You will see emergency contact fields. Make changes and tap the edit/save button at the top to sync it to the backend.',
    category: 'general',
  },
];

const HelpSupportScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'attendance' | 'leave' | 'general'>('all');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+918005550199').catch(() => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Dial',
        text2: 'Call functionality is not supported on this device.',
      });
    });
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@tionix.com?subject=Tionix%20Xone%20Support').catch(() => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Open Mailer',
        text2: 'Mail client is not configured on this device.',
      });
    });
  };

  const handleSubmitTicket = () => {
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in both subject and description fields.',
      });
      return;
    }

    Toast.show({
      type: 'success',
      text1: 'Ticket Submitted',
      text2: 'Our support team will address your request shortly.',
    });
    setTicketSubject('');
    setTicketDescription('');
  };

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Custom AppBar */}
      <AppBar title="Help & Support" showBackButton onBackPress={() => navigation.goBack()} />

      {/* Stunning Background Banner */}
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(254, 0, 0, 0.15)', 'rgba(254, 0, 0, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Search Header */}
        <View style={styles.searchSection}>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSubtitle}>Find instant answers or reach out directly to support</Text>
          <View style={styles.searchBoxContainer}>
            <Ionicons name="search-outline" size={moderateScale(20)} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search FAQs, topics, keywords..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={moderateScale(18)} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Filter Tabs */}
        <View style={styles.tabsContainer}>
          {(['all', 'attendance', 'leave', 'general'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.tabButton, selectedCategory === cat && styles.tabButtonActive]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, selectedCategory === cat && styles.tabTextActive]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedId === faq.id;
              return (
                <AppCard key={faq.id} style={styles.faqCard}>
                  <TouchableOpacity
                    style={styles.faqHeader}
                    onPress={() => toggleExpand(faq.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={moderateScale(18)}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.faqBody}>
                      <View style={styles.faqDivider} />
                      <Text style={styles.faqAnswer}>{faq.answer}</Text>
                    </View>
                  )}
                </AppCard>
              );
            })
          ) : (
            <View style={styles.noFaqs}>
              <Ionicons name="search-outline" size={moderateScale(40)} color={Colors.textMuted} />
              <Text style={styles.noFaqText}>No results match your query.</Text>
            </View>
          )}
        </View>

        {/* Submit Ticket Form */}
        <AppCard style={styles.ticketCard}>
          <Text style={styles.sectionTitle}>Submit a Support Ticket</Text>
          <Text style={styles.cardSubtitle}>Describe your issue and we'll resolve it.</Text>

          <TextInput
            style={styles.ticketInput}
            placeholder="Subject / Issue Title"
            placeholderTextColor={Colors.textMuted}
            value={ticketSubject}
            onChangeText={setTicketSubject}
          />
          <TextInput
            style={[styles.ticketInput, styles.ticketTextArea]}
            placeholder="Provide details about your problem..."
            placeholderTextColor={Colors.textMuted}
            value={ticketDescription}
            onChangeText={setTicketDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmitTicket} activeOpacity={0.8}>
            <Ionicons name="paper-plane-outline" size={moderateScale(16)} color={Colors.white} />
            <Text style={styles.submitButtonText}>Submit Ticket</Text>
          </TouchableOpacity>
        </AppCard>

        {/* Direct Contacts */}
        <View style={styles.contactContainer}>
          <Text style={styles.sectionTitle}>Direct Contacts</Text>
          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactBox} onPress={handleCallSupport} activeOpacity={0.8}>
              <Ionicons name="call-outline" size={moderateScale(24)} color={Colors.primary} />
              <Text style={styles.contactBoxTitle}>Call Support</Text>
              <Text style={styles.contactBoxSubtitle}>24/7 Hotline</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactBox} onPress={handleEmailSupport} activeOpacity={0.8}>
              <Ionicons name="mail-outline" size={moderateScale(24)} color={Colors.primary} />
              <Text style={styles.contactBoxTitle}>Email HR</Text>
              <Text style={styles.contactBoxSubtitle}>Response &lt;24h</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: moderateScale(280),
    overflow: 'hidden',
    zIndex: -1,
  },
  bannerGradient: {
    flex: 1,
  },
  bannerBlurOrb1: {
    position: 'absolute',
    top: -moderateScale(50),
    left: -moderateScale(50),
    width: moderateScale(200),
    height: moderateScale(200),
    borderRadius: moderateScale(100),
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    filter: 'blur(40px)',
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(40),
    right: -moderateScale(60),
    width: moderateScale(250),
    height: moderateScale(250),
    borderRadius: moderateScale(125),
    backgroundColor: 'rgba(254, 0, 0, 0.1)',
    filter: 'blur(50px)',
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: moderateScale(120),
    gap: Theme.spacing.lg,
  },
  searchSection: {
    marginBottom: moderateScale(10),
  },
  heroTitle: {
    ...Typography.heading,
    fontSize: moderateScale(26),
    color: Colors.text,
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: moderateScale(14),
    marginTop: moderateScale(6),
  },
  searchBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.md,
    height: moderateScale(50),
    marginTop: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  searchIcon: {
    marginRight: Theme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: moderateScale(8),
    marginBottom: moderateScale(4),
  },
  tabButton: {
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(8),
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(254, 0, 0, 0.1)',
    borderColor: 'rgba(254, 0, 0, 0.15)',
  },
  tabText: {
    ...Typography.caption,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  faqSection: {
    gap: Theme.spacing.xs,
  },
  sectionTitle: {
    ...Typography.label,
    fontSize: moderateScale(13),
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: moderateScale(8),
  },
  faqCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.sm,
    marginBottom: moderateScale(8),
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  faqQuestion: {
    ...Typography.heading,
    fontSize: moderateScale(14),
    color: Colors.text,
    flex: 1,
  },
  faqBody: {
    marginTop: Theme.spacing.sm,
  },
  faqDivider: {
    height: 0.5,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: Theme.spacing.sm,
  },
  faqAnswer: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    lineHeight: moderateScale(18),
  },
  noFaqs: {
    paddingVertical: moderateScale(40),
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  noFaqText: {
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.textMuted,
  },
  ticketCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
  },
  cardSubtitle: {
    ...Typography.body,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginBottom: Theme.spacing.md,
  },
  ticketInput: {
    height: moderateScale(45),
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    color: Colors.text,
    ...Typography.body,
    fontSize: moderateScale(14),
    marginBottom: Theme.spacing.sm,
  },
  ticketTextArea: {
    height: moderateScale(100),
    paddingTop: Theme.spacing.sm,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Theme.borderRadius.md,
    height: moderateScale(45),
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.xs,
    ...Theme.shadow.sm,
    shadowColor: Colors.primary,
  },
  submitButtonText: {
    ...Typography.heading,
    fontSize: moderateScale(14),
    color: Colors.white,
  },
  contactContainer: {
    marginTop: moderateScale(8),
  },
  contactRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  contactBox: {
    flex: 1,
    backgroundColor: 'rgba(254, 0, 0, 0.04)',
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: moderateScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(254, 0, 0, 0.1)',
  },
  contactBoxTitle: {
    ...Typography.heading,
    fontSize: moderateScale(14),
    color: Colors.text,
    marginTop: Theme.spacing.sm,
  },
  contactBoxSubtitle: {
    ...Typography.caption,
    fontSize: moderateScale(11),
    color: Colors.textMuted,
    marginTop: moderateScale(2),
  },
});

export default HelpSupportScreen;
