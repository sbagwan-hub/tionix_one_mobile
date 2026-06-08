import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors, Theme } from '../theme/colors';
import { Typography } from '../theme/typography';
import { moderateScale } from '../utils/responsive';

type TextFieldProps = TextInputProps & {
  label: string;
};

const TextField = ({ label, style, onFocus, onBlur, ...props }: TextFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, isFocused && styles.labelFocused]}>{label}</Text>
      <View
        style={[
          styles.field,
          isFocused && styles.fieldFocused,
        ]}
      >
        <TextInput
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, style]}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    ...Typography.label,
    marginBottom: Theme.spacing.sm,
    marginLeft: 4,
    color: Colors.textSecondary,
  },
  labelFocused: {
    color: Colors.primary,
  },
  field: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 14,
  },
  fieldFocused: {
    borderColor: Colors.inputFocusedBorder,
    backgroundColor: Colors.inputBgFocused,
  },
  input: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(16),
    color: Colors.text,
    padding: 0,
  },
});

export default TextField;
