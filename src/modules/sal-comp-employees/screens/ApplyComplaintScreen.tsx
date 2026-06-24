import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AppBar from '../../../components/AppBar';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { createComplaint, getEmployeeList, ComplaintType, COMPLAINT_TYPE_LABELS, COMPLAINT_TYPE_COLORS, COMPLAINT_TYPE_ICONS } from '../services/complaints.service';
import { EmployeeOption } from '../../loan-request/services/loan-request.service';
import { getAuthSession } from '../../auth/services/auth';
import Toast from 'react-native-toast-message';

const PRIMARY_GRADIENT = Colors.primaryGradient;

const FormCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.formCard}>
    <Text style={styles.cardHeading}>{title}</Text>
    <View style={styles.cardContent}>{children}</View>
  </View>
);

const InputWrapper = ({
  icon,
  label,
  children,
  isFocused,
  style,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
  isFocused?: boolean;
  style?: any;
}) => {
  const isTextArea = style && style.alignItems === 'flex-start';
  return (
    <View style={styles.inputWrapperContainer}>
      <Text style={styles.inputWrapperLabel}>{label}</Text>
      <View style={[
        styles.inputFieldContainer,
        isFocused && styles.inputFieldContainerFocused,
        style
      ]}>
        <Ionicons
          name={icon as any}
          size={moderateScale(16)}
          color={isFocused ? Colors.primary : '#64748B'}
          style={[styles.inputFieldIcon, isTextArea && { marginTop: moderateScale(12) }]}
        />
        {children}
      </View>
    </View>
  );
};

const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getFileIconName = (docType: string) => {
  const type = docType.toLowerCase();
  if (type === 'pdf') return 'document-text-outline';
  if (['png', 'jpg', 'jpeg'].includes(type)) return 'image-outline';
  if (['mp4', 'mov', 'mkv', 'avi'].includes(type)) return 'videocam-outline';
  if (['doc', 'docx'].includes(type)) return 'document-outline';
  if (['xls', 'xlsx', 'csv'].includes(type)) return 'grid-outline';
  return 'document-attach-outline';
};

const getFileIconColor = (docType: string) => {
  const type = docType.toLowerCase();
  if (type === 'pdf') return '#EF4444'; // Red
  if (['png', 'jpg', 'jpeg'].includes(type)) return '#10B981'; // Green
  if (['mp4', 'mov', 'mkv', 'avi'].includes(type)) return '#8B5CF6'; // Purple
  if (['doc', 'docx'].includes(type)) return '#3B82F6'; // Blue
  if (['xls', 'xlsx', 'csv'].includes(type)) return '#059669'; // Emerald
  return '#6B7280';
};

const getDocTypeBg = (docType: string) => {
  const type = docType.toLowerCase();
  if (type === 'pdf') return 'rgba(239, 68, 68, 0.08)';
  if (['png', 'jpg', 'jpeg'].includes(type)) return 'rgba(16, 185, 129, 0.08)';
  if (['mp4', 'mov', 'mkv', 'avi'].includes(type)) return 'rgba(139, 92, 246, 0.08)'; // Purple bg
  if (['doc', 'docx'].includes(type)) return 'rgba(59, 130, 246, 0.08)';
  if (['xls', 'xlsx', 'csv'].includes(type)) return 'rgba(5, 150, 105, 0.08)';
  return 'rgba(107, 114, 128, 0.08)';
};

const ApplyComplaintScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<ComplaintType>('complaint');
  const [selectedEmployees, setSelectedEmployees] = useState<EmployeeOption[]>([]);
  const [attachments, setAttachments] = useState<{ file_name: string; file_path: string; doc_type: string }[]>([]);

  // Focus states for inputs
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);

  // System states
  const [employeesList, setEmployeesList] = useState<EmployeeOption[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selector modals states
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [empSearchQuery, setEmpSearchQuery] = useState('');

  // Load employee list on mount (filtering out the logged in user)
  useEffect(() => {
    (async () => {
      try {
        const session = await getAuthSession();
        const loggedInEmpId = Number(session?.user?.fkEmpId || 0);

        const list = await getEmployeeList();
        const filteredList = list.filter((emp) => Number(emp.pk_emp_id) !== loggedInEmpId);
        setEmployeesList(filteredList);
      } catch (err: any) {
        console.error('Failed to load employees list:', err);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load employee list. Please check connection.',
        });
      } finally {
        setIsLoadingEmployees(false);
      }
    })();
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!empSearchQuery.trim()) return employeesList;
    const query = empSearchQuery.toLowerCase();
    return employeesList.filter(
      (emp) =>
        emp.contact_name.toLowerCase().includes(query) ||
        emp.emp_code.toLowerCase().includes(query)
    );
  }, [employeesList, empSearchQuery]);

  const toggleEmployeeSelection = (employee: EmployeeOption) => {
    const isSelected = selectedEmployees.some((emp) => emp.pk_emp_id === employee.pk_emp_id);
    if (isSelected) {
      setSelectedEmployees(selectedEmployees.filter((emp) => emp.pk_emp_id !== employee.pk_emp_id));
    } else {
      setSelectedEmployees([...selectedEmployees, employee]);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      const extension = file.name.split('.').pop() || 'dat';

      setAttachments((prev) => [
        ...prev,
        {
          file_name: file.name,
          file_path: file.uri,
          doc_type: extension.toLowerCase(),
        },
      ]);
    } catch (err: any) {
      console.error('Failed to pick document:', err);
      Toast.show({
        type: 'error',
        text1: 'Pick Error',
        text2: 'Failed to select file.',
      });
    }
  };

  const handlePickImage = async (useCamera: boolean, isVideo = false) => {
    try {
      let permissionResult;
      if (useCamera) {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Denied',
          `You need to allow ${useCamera ? 'camera' : 'gallery'} access to select media.`
        );
        return;
      }

      const mediaTypes = isVideo
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images;

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
          mediaTypes,
          quality: 0.8,
        })
        : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          quality: 0.8,
        });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.fileName || `${isVideo ? 'video' : 'photo'}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
      const extension = fileName.split('.').pop() || (isVideo ? 'mp4' : 'jpg');

      setAttachments((prev) => [
        ...prev,
        {
          file_name: fileName,
          file_path: asset.uri,
          doc_type: extension.toLowerCase(),
        },
      ]);
    } catch (err: any) {
      console.error('Failed to pick media:', err);
      Toast.show({
        type: 'error',
        text1: 'Pick Error',
        text2: 'Failed to select media.',
      });
    }
  };

  const handleAttachmentPress = () => {
    Alert.alert(
      'Add Attachment',
      'Select file source:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => handlePickImage(true, false) },
        { text: 'Record Video', onPress: () => handlePickImage(true, true) },
        { text: 'Choose Photo/Video', onPress: () => handlePickImage(false, false) },
        { text: 'Browse Files', onPress: handlePickDocument },
      ]
    );
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Complaint title is required.',
      });
      return;
    }

    if (selectedEmployees.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please link at least one employee.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        type: selectedType,
        employee_ids: selectedEmployees.map((emp) => emp.pk_emp_id),
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      await createComplaint(payload);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Complaint filed successfully.',
      });
      navigation.goBack();
    } catch (err: any) {
      console.error('Complaint submission failed:', err);
      Toast.show({
        type: 'error',
        text1: 'Submission Failed',
        text2: err.message || 'Failed to file complaint.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Custom AppBar */}
      <AppBar title="File a Complaint" showBackButton onBackPress={() => navigation.goBack()} />

      {/* Header Banner */}
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.12)', 'rgba(255, 77, 28, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + moderateScale(100) }]}
        >
          {/* 1. Basic Fields */}
          <FormCard title="Complaint Details">
            <InputWrapper icon="create-outline" label="TITLE *" isFocused={isTitleFocused}>
              <TextInput
                style={styles.textInputField}
                onFocus={() => setIsTitleFocused(true)}
                onBlur={() => setIsTitleFocused(false)}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Broken hardware, office ventilation issue"
                placeholderTextColor={Colors.textMuted}
              />
            </InputWrapper>

            <InputWrapper
              icon="document-text-outline"
              label="DESCRIPTION (OPTIONAL)"
              isFocused={isDescFocused}
              style={styles.textareaInputContainer}
            >
              <TextInput
                style={styles.textareaInputField}
                onFocus={() => setIsDescFocused(true)}
                onBlur={() => setIsDescFocused(false)}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                placeholder="Provide a detailed description..."
                placeholderTextColor={Colors.textMuted}
                textAlignVertical="top"
              />
            </InputWrapper>
          </FormCard>

          {/* 1b. Type Selector */}
          <FormCard title="Complaint Type">
            <View style={styles.typeRow}>
              {(['complaint', 'suggestion', 'feedback', 'appraisal'] as ComplaintType[]).map((type) => {
                const isSelected = selectedType === type;
                const colors = COMPLAINT_TYPE_COLORS[type];
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typePill,
                      {
                        backgroundColor: isSelected ? colors.bg : '#F8FAFC',
                        borderColor: isSelected ? colors.border : '#E2E8F0',
                        borderWidth: isSelected ? 1.5 : 1,
                      },
                    ]}
                    onPress={() => setSelectedType(type)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={COMPLAINT_TYPE_ICONS[type] as any}
                      size={moderateScale(14)}
                      color={isSelected ? colors.text : '#94A3B8'}
                    />
                    <Text style={[styles.typePillText, { color: isSelected ? colors.text : '#94A3B8' }]}>
                      {COMPLAINT_TYPE_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FormCard>

          {/* 2. Employee Selector */}
          <FormCard title="Linked Staff *">
            <TouchableOpacity
              style={styles.selectButton}
              activeOpacity={0.8}
              onPress={() => setIsEmpModalOpen(true)}
            >
              <Ionicons name="people-outline" size={moderateScale(20)} color={Colors.primary} />
              <Text style={styles.selectButtonText}>
                {selectedEmployees.length === 0
                  ? 'Select Employees to link'
                  : `${selectedEmployees.length} employee(s) selected`}
              </Text>
              <Ionicons name="chevron-forward-outline" size={moderateScale(18)} color={Colors.textMuted} />
            </TouchableOpacity>

            {selectedEmployees.length > 0 ? (
              <View style={styles.selectedContainer}>
                {selectedEmployees.map((emp) => (
                  <View key={emp.pk_emp_id} style={styles.badgeItem}>
                    <View style={styles.avatarCircleSmall}>
                      <Text style={styles.avatarTextSmall}>{getInitials(emp.contact_name)}</Text>
                    </View>
                    <Text style={styles.badgeText}>
                      {emp.contact_name} <Text style={styles.badgeCode}>({emp.emp_code})</Text>
                    </Text>
                    <TouchableOpacity onPress={() => toggleEmployeeSelection(emp)} activeOpacity={0.7} style={styles.removeBadgeBtn}>
                      <Ionicons name="close" size={moderateScale(12)} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
          </FormCard>

          {/* 3. Attachments */}
          <FormCard title="Attachments">
            <TouchableOpacity
              style={styles.selectButton}
              activeOpacity={0.8}
              onPress={handleAttachmentPress}
            >
              <Ionicons name="attach-outline" size={moderateScale(20)} color={Colors.primary} />
              <Text style={styles.selectButtonText}>Add File Attachment</Text>
              <Ionicons name="add-outline" size={moderateScale(18)} color={Colors.primary} />
            </TouchableOpacity>

            {attachments.length > 0 ? (
              <View style={styles.filesContainer}>
                {attachments.map((file, idx) => (
                  <View key={idx} style={styles.fileCardRow}>
                    <View style={[styles.fileIconContainer, { backgroundColor: getDocTypeBg(file.doc_type) }]}>
                      <Ionicons name={getFileIconName(file.doc_type) as any} size={moderateScale(14)} color={getFileIconColor(file.doc_type)} />
                    </View>
                    <View style={styles.fileMetaContainer}>
                      <Text style={styles.fileCardText} numberOfLines={1}>
                        {file.file_name}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveAttachment(idx)} style={styles.fileDeleteBtn} activeOpacity={0.7}>
                      <Ionicons name="trash-outline" size={15} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
          </FormCard>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={PRIMARY_GRADIENT}
              style={styles.gradientBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'SUBMITTING...' : 'FILE COMPLAINT'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Employees Multi-select Bottom Sheet */}
      <Modal
        visible={isEmpModalOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setIsEmpModalOpen(false)}
      >
        {/* Dimmed backdrop — tap to close */}
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsEmpModalOpen(false)}
        />

        <View style={styles.modalSheet}>
          {/* Drag Handle */}
          <View style={styles.modalDragHandle} />

          {/* Header Row */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Ionicons name="people" size={moderateScale(18)} color={Colors.primary} />
              <Text style={styles.modalTitle}>Link Staff</Text>
              {selectedEmployees.length > 0 ? (
                <View style={styles.modalCountBadge}>
                  <Text style={styles.modalCountBadgeText}>{selectedEmployees.length}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => setIsEmpModalOpen(false)}
              style={styles.modalClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={moderateScale(20)} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={moderateScale(16)} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={empSearchQuery}
              onChangeText={setEmpSearchQuery}
              placeholder="Search by name or code..."
              placeholderTextColor={Colors.textMuted}
              returnKeyType="search"
              autoCorrect={false}
            />
            {empSearchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setEmpSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={moderateScale(16)} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Quick Actions Row — Select All / Deselect All */}
          {!isLoadingEmployees && filteredEmployees.length > 0 ? (
            <View style={styles.modalQuickActions}>
              <Text style={styles.modalResultCount}>
                {filteredEmployees.length} {filteredEmployees.length === 1 ? 'person' : 'people'} found
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const allSelected = filteredEmployees.every((e) =>
                    selectedEmployees.some((s) => s.pk_emp_id === e.pk_emp_id)
                  );
                  if (allSelected) {
                    // Deselect all filtered
                    setSelectedEmployees((prev) =>
                      prev.filter((p) => !filteredEmployees.some((f) => f.pk_emp_id === p.pk_emp_id))
                    );
                  } else {
                    // Add all filtered that aren't already selected
                    const toAdd = filteredEmployees.filter(
                      (f) => !selectedEmployees.some((s) => s.pk_emp_id === f.pk_emp_id)
                    );
                    setSelectedEmployees((prev) => [...prev, ...toAdd]);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSelectAllText}>
                  {filteredEmployees.every((e) =>
                    selectedEmployees.some((s) => s.pk_emp_id === e.pk_emp_id)
                  )
                    ? 'Deselect All'
                    : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.modalDivider} />

          {/* List */}
          {isLoadingEmployees ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Fetching staff list...</Text>
            </View>
          ) : filteredEmployees.length === 0 ? (
            <View style={styles.modalEmpty}>
              <View style={styles.modalEmptyIcon}>
                <Ionicons name="search-outline" size={moderateScale(28)} color="#94A3B8" />
              </View>
              <Text style={styles.modalEmptyText}>No staff found</Text>
              <Text style={styles.modalEmptySubtext}>Try a different name or code</Text>
            </View>
          ) : (
            <FlatList
              data={filteredEmployees}
              keyExtractor={(item) => String(item.pk_emp_id)}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isChecked = selectedEmployees.some((emp) => emp.pk_emp_id === item.pk_emp_id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.empRowItem,
                      isChecked && styles.empRowItemSelected,
                    ]}
                    activeOpacity={0.6}
                    onPress={() => toggleEmployeeSelection(item)}
                  >
                    {/* Avatar */}
                    <View style={[
                      styles.avatarCircleMedium,
                      { backgroundColor: isChecked ? Colors.primary : '#E2E8F0' },
                    ]}>
                      <Text style={[
                        styles.avatarTextMedium,
                        { color: isChecked ? Colors.white : Colors.textSecondary },
                      ]}>
                        {getInitials(item.contact_name)}
                      </Text>
                    </View>

                    {/* Info */}
                    <View style={styles.empRowDetails}>
                      <Text style={[
                        styles.empRowName,
                        isChecked && { color: Colors.primary },
                      ]}>
                        {item.contact_name}
                      </Text>
                      <Text style={styles.empRowCode}>
                        {item.emp_code}{item.designation ? ` · ${item.designation}` : ''}
                      </Text>
                    </View>

                    {/* Checkbox */}
                    <View style={[
                      styles.empCheckbox,
                      isChecked && styles.empCheckboxChecked,
                    ]}>
                      {isChecked ? (
                        <Ionicons name="checkmark" size={moderateScale(12)} color={Colors.white} />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.listContainer}
            />
          )}

          {/* Sticky Footer */}
          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + moderateScale(8) }]}>
            <TouchableOpacity
              style={[styles.modalClearBtn, selectedEmployees.length === 0 && { opacity: 0.4 }]}
              onPress={() => setSelectedEmployees([])}
              disabled={selectedEmployees.length === 0}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={moderateScale(16)} color={Colors.error} />
              <Text style={styles.modalClearText}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={() => setIsEmpModalOpen(false)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={PRIMARY_GRADIENT}
                style={styles.gradientModalConfirm}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkmark-circle-outline" size={moderateScale(16)} color={Colors.white} />
                <Text style={styles.modalConfirmBtnText}>
                  {selectedEmployees.length === 0
                    ? 'Select Staff'
                    : `Confirm  ${selectedEmployees.length} Selected`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: moderateScale(220),
    overflow: 'hidden',
    zIndex: -1,
  },
  bannerGradient: {
    flex: 1,
  },
  bannerBlurOrb1: {
    position: 'absolute',
    top: -moderateScale(40),
    left: -moderateScale(40),
    width: moderateScale(180),
    height: moderateScale(180),
    borderRadius: moderateScale(90),
    backgroundColor: 'rgba(255, 179, 0, 0.06)',
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(20),
    right: -moderateScale(50),
    width: moderateScale(220),
    height: moderateScale(220),
    borderRadius: moderateScale(110),
    backgroundColor: 'rgba(255, 77, 28, 0.05)',
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(20),
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardHeading: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: Colors.text,
    marginBottom: Theme.spacing.md,
  },
  cardContent: {
    gap: Theme.spacing.md,
  },
  // Unified Input Styles
  inputWrapperContainer: {
    marginBottom: Theme.spacing.xs,
  },
  inputWrapperLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(11),
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: Theme.spacing.xs,
    marginLeft: 4,
  },
  inputFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: Theme.spacing.md,
    height: moderateScale(48),
  },
  inputFieldContainerFocused: {
    borderColor: Colors.primary,
  },
  inputFieldIcon: {
    marginRight: moderateScale(10),
  },
  textInputField: {
    flex: 1,
    height: '100%',
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(14),
    color: Colors.text,
    paddingVertical: 0,
  },
  textareaInputContainer: {
    height: undefined,
    minHeight: moderateScale(100),
    alignItems: 'flex-start',
    paddingVertical: moderateScale(8),
  },
  textareaInputField: {
    flex: 1,
    height: '100%',
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(14),
    color: Colors.text,
    paddingVertical: 0,
    marginTop: moderateScale(4),
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: moderateScale(12),
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: moderateScale(14),
    gap: Theme.spacing.sm,
  },
  selectButtonText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    flex: 1,
  },
  selectedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
    marginTop: moderateScale(8),
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 28, 0.05)',
    paddingRight: moderateScale(6),
    paddingLeft: moderateScale(4),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(20),
    gap: moderateScale(6),
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 28, 0.12)',
  },
  avatarCircleSmall: {
    width: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(9),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextSmall: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(8),
    color: Colors.white,
  },
  badgeText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
  },
  badgeCode: {
    color: Colors.textMuted,
    fontFamily: 'Outfit_450',
  },
  removeBadgeBtn: {
    width: moderateScale(14),
    height: moderateScale(14),
    borderRadius: moderateScale(7),
    backgroundColor: 'rgba(255, 77, 28, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filesContainer: {
    marginTop: moderateScale(8),
    gap: moderateScale(6),
  },
  fileCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(14),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: moderateScale(10),
  },
  fileIconContainer: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileMetaContainer: {
    flex: 1,
  },
  fileCardText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(13),
    color: Colors.text,
  },
  fileDeleteBtn: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    borderRadius: moderateScale(14),
    overflow: 'hidden',
    marginTop: Theme.spacing.md,
    ...Theme.shadow.md,
  },
  gradientBtn: {
    paddingVertical: moderateScale(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: 'Outfit_700Bold',
    color: Colors.white,
    fontSize: moderateScale(15),
    letterSpacing: 0.5,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: moderateScale(28),
    borderTopRightRadius: moderateScale(28),
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: moderateScale(10),
    height: '80%',
    ...Theme.shadow.floating,
  },
  modalDragHandle: {
    width: moderateScale(40),
    height: moderateScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: moderateScale(14),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(14),
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  modalTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  modalCountBadge: {
    backgroundColor: Colors.primary,
    borderRadius: moderateScale(10),
    minWidth: moderateScale(20),
    height: moderateScale(20),
    paddingHorizontal: moderateScale(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCountBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(10),
    color: Colors.white,
  },
  modalClose: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(10),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalQuickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(10),
    paddingHorizontal: moderateScale(2),
  },
  modalResultCount: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(12),
    color: Colors.textMuted,
  },
  modalSelectAllText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    color: Colors.primary,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: moderateScale(4),
  },
  modalEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(8),
  },
  modalEmptyIcon: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: moderateScale(4),
  },
  modalEmptyText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(15),
    color: '#475569',
  },
  modalEmptySubtext: {
    fontFamily: 'Outfit_400Regular',
    fontSize: moderateScale(12),
    color: '#94A3B8',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: moderateScale(10),
    paddingTop: moderateScale(12),
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(13),
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(239, 68, 68, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  modalClearText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(13),
    color: Colors.error,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: moderateScale(12),
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: moderateScale(8),
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(14),
    color: Colors.text,
    fontFamily: 'Outfit_500Medium',
  },
  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  loadingText: {
    fontFamily: 'Outfit_500Medium',
    color: Colors.textMuted,
  },
  listContainer: {
    paddingBottom: moderateScale(8),
  },
  empRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(11),
    paddingHorizontal: moderateScale(10),
    marginVertical: moderateScale(2),
    borderRadius: moderateScale(14),
    backgroundColor: 'transparent',
  },
  empRowItemSelected: {
    backgroundColor: 'rgba(255, 77, 28, 0.05)',
  },
  avatarCircleMedium: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: moderateScale(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(12),
  },
  avatarTextMedium: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
  },
  empRowDetails: {
    flex: 1,
  },
  empRowName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  empRowCode: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    color: Colors.textMuted,
    marginTop: moderateScale(2),
  },
  empCheckbox: {
    width: moderateScale(22),
    height: moderateScale(22),
    borderRadius: moderateScale(7),
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empCheckboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modalConfirmBtn: {
    flex: 1,
    borderRadius: moderateScale(12),
    overflow: 'hidden',
    ...Theme.shadow.sm,
  },
  gradientModalConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(6),
    paddingVertical: moderateScale(14),
    paddingHorizontal: moderateScale(16),
  },
  modalConfirmBtnText: {
    fontFamily: 'Outfit_700Bold',
    color: Colors.white,
    fontSize: moderateScale(14),
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(9),
    borderRadius: moderateScale(12),
    minWidth: '45%',
    flex: 1,
    justifyContent: 'center',
  },
  typePillText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(12),
  },
});

export default ApplyComplaintScreen;
