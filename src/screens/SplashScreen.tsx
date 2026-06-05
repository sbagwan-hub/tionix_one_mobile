import React, { useEffect } from 'react';
import { View, Image, StatusBar, Text, StyleSheet } from 'react-native';
import { Colors, Theme } from '../theme/colors';
import { Typography } from '../theme/typography';
import { getAuthSession } from '../services/auth';
import { moderateScale } from '../utils/responsive';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

const SplashScreen = ({ navigation }: any) => {
  useEffect(() => {
    let isMounted = true;

    const openInitialScreen = async () => {
      const session = await getAuthSession();

      if (!isMounted) {
        return;
      }

      navigation.reset({
        index: 0,
        routes: [{ name: session ? 'MainTabs' : 'Onboarding' }],
      });
    };

    const timer = setTimeout(() => {
      openInitialScreen().catch(() => {
        if (isMounted) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Onboarding' }],
          });
        }
      });
    }, 2000); // 2 second display time

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      <View style={styles.background}>
        <View style={styles.content}>
          <Animated.View 
            entering={FadeInDown.duration(800).springify()} 
            exiting={FadeOut.duration(400)}
            style={styles.logoFrame}
          >
            <Image
              source={require('../assets/app_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
          
          <Animated.Text 
            entering={FadeIn.delay(300).duration(800)}
            style={styles.brand}
          >
            XONE
          </Animated.Text>
          
          <Animated.View 
            entering={FadeIn.delay(500).duration(800)}
            style={styles.divider} 
          />
          
          <Animated.Text 
            entering={FadeIn.delay(700).duration(800)}
            style={styles.tagline}
          >
            Track time. Stay accountable.
          </Animated.Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background, // Light airy background
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  logoFrame: {
    width: moderateScale(130),
    height: moderateScale(130),
    borderRadius: Theme.borderRadius.xxl,
    backgroundColor: Colors.white,
    padding: moderateScale(20),
    marginBottom: Theme.spacing.lg,
    ...Theme.shadow.floating,
    shadowColor: 'rgba(0,0,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: Theme.borderRadius.md,
  },
  brand: {
    ...Typography.display,
    color: Colors.text,
    fontSize: moderateScale(38),
    marginBottom: Theme.spacing.sm,
    letterSpacing: -0.5,
  },
  divider: {
    width: moderateScale(40),
    height: moderateScale(4),
    backgroundColor: Colors.primary,
    borderRadius: Theme.borderRadius.pill,
    marginBottom: Theme.spacing.md,
  },
  tagline: {
    ...Typography.body,
    fontFamily: 'Outfit_600SemiBold',
    color: Colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default SplashScreen;
