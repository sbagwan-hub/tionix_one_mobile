import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ViewToken,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '../icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Theme } from '../theme/colors';
import { moderateScale } from '../utils/responsive';
import { Typography } from '../theme/typography';

// baseline dimensions from responsive.ts

const slides = [
  {
    id: '1',
    title: 'Precision\nTracking',
    description: 'High-accuracy geofencing ensures your attendance is marked only when you reach the office zone.',
    icon: 'locate-outline',
    tag: 'RELIABLE',
    iconColor: Colors.primary,
    gradientColors: ['rgba(99, 102, 241, 0.08)', 'rgba(79, 70, 229, 0.12)'],
  },
  {
    id: '2',
    title: 'Smart\nDashboards',
    description: 'Monitor your monthly progress, late arrivals, and work hours with beautiful interactive charts.',
    icon: 'stats-chart-outline',
    tag: 'ANALYTICS',
    iconColor: Colors.accent,
    gradientColors: ['rgba(251, 146, 60, 0.08)', 'rgba(249, 115, 22, 0.12)'],
  },
  {
    id: '3',
    title: 'Seamless\nWorkflows',
    description: 'From leave requests to overtime tracking, manage your professional life with a single tap.',
    icon: 'sparkles-outline',
    tag: 'EFFICIENT',
    iconColor: Colors.success,
    gradientColors: ['rgba(52, 211, 153, 0.08)', 'rgba(16, 185, 129, 0.12)'],
  },
];

// --- Subcomponents ---

const Slide = ({ item, index, scrollX, width, height }: any) => {
  const shieldStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [50, 0, -50], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ scale }, { translateY }] as any,
    };
  });

  const textContainerStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const translateY = interpolate(scrollX.value, inputRange, [100, 0, -100], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateY }] as any,
    };
  });

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={[styles.imageContainer, { height: height * 0.45 }, shieldStyle]}>
        <View style={[styles.iconShieldBackground, { backgroundColor: item.gradientColors[0] }]} />
        <LinearGradient colors={item.gradientColors} style={styles.iconShield}>
          <Ionicons name={item.icon as any} size={90} color={item.iconColor} />
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.textContainer, textContainerStyle]}>
        <View style={[styles.tagBadge, { backgroundColor: `${item.iconColor}15` }]}>
          <Text style={[styles.tagText, { color: item.iconColor }]}>{item.tag}</Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </Animated.View>
    </View>
  );
};

const Pagination = ({ data, scrollX, width }: any) => {
  return (
    <View style={styles.indicatorContainer}>
      {data.map((_: any, i: number) => {
        const minWidth = moderateScale(8);
        const maxWidth = moderateScale(24);
        
        const dotStyle = useAnimatedStyle(() => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = interpolate(scrollX.value, inputRange, [minWidth, maxWidth, minWidth], Extrapolation.CLAMP);
          const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP);
          
          return {
            width: dotWidth,
            opacity,
          };
        });

        return (
          <Animated.View
            key={i.toString()}
            style={[styles.dot, dotStyle, { backgroundColor: Colors.primary }]}
          />
        );
      })}
    </View>
  );
};

const OnboardingScreen = ({ navigation }: any) => {
  const { width, height } = useWindowDimensions();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<Animated.FlatList<any>>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const viewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]) {
      setCurrentSlideIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goToNextSlide = () => {
    const nextSlideIndex = currentSlideIndex + 1;
    if (nextSlideIndex < slides.length) {
      flatListRef.current?.scrollToIndex({ index: nextSlideIndex, animated: true });
    } else {
      navigation.replace('Login');
    }
  };

  const isLastSlide = currentSlideIndex === slides.length - 1;

  // Manual animations replacing Moti
  const skipOpacity = useSharedValue(1);
  const nextScale = useSharedValue(1);
  
  // Icon animations inside the next button
  const iconOpacity = useSharedValue(1);
  const iconScale = useSharedValue(1);
  const iconRotate = useSharedValue(0); // in degrees

  useEffect(() => {
    if (isLastSlide) {
      skipOpacity.value = withTiming(0, { duration: 300 });
      nextScale.value = withSpring(1.08, { damping: 15, stiffness: 120 });
      
      // Animate icon out then in as checkmark
      iconOpacity.value = withTiming(0, { duration: 150 }, () => {
        iconRotate.value = -90;
        iconScale.value = 0.5;
        iconOpacity.value = withTiming(1, { duration: 150 });
        iconRotate.value = withSpring(0, { stiffness: 200, damping: 20 });
        iconScale.value = withSpring(1, { stiffness: 200, damping: 20 });
      });
    } else {
      skipOpacity.value = withTiming(1, { duration: 300 });
      nextScale.value = withSpring(1, { damping: 15, stiffness: 120 });
      
      iconOpacity.value = withTiming(0, { duration: 150 }, () => {
        iconRotate.value = 90;
        iconScale.value = 0.5;
        iconOpacity.value = withTiming(1, { duration: 150 });
        iconRotate.value = withSpring(0, { stiffness: 200, damping: 20 });
        iconScale.value = withSpring(1, { stiffness: 200, damping: 20 });
      });
    }
  }, [isLastSlide, skipOpacity, nextScale, iconOpacity, iconRotate, iconScale]);

  // Auto-switch pages
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (!isLastSlide) {
      timer = setInterval(() => {
        flatListRef.current?.scrollToIndex({ index: currentSlideIndex + 1, animated: true });
      }, 3500); // 3.5 seconds per slide
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentSlideIndex, isLastSlide]);

  const skipStyle = useAnimatedStyle(() => ({
    opacity: skipOpacity.value,
  }));

  const nextButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nextScale.value }] as any,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotate.value}deg` }
    ] as any,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      <View style={styles.topBar}>
        <Animated.View style={skipStyle} pointerEvents={isLastSlide ? 'none' : 'auto'}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.replace('Login')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.skipButton}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Animated.FlatList
        ref={flatListRef as any}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        renderItem={({ item, index }) => (
          <Slide item={item} index={index} scrollX={scrollX} width={width} height={height} />
        )}
      />

      <View style={styles.bottomBar}>
        <Pagination data={slides} scrollX={scrollX} width={width} />

        <TouchableOpacity 
          activeOpacity={0.88} 
          onPress={goToNextSlide}
          style={styles.nextButtonWrapper}
        >
          <Animated.View style={nextButtonStyle}>
            <LinearGradient
              colors={isLastSlide ? Colors.successGradient : Colors.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextButton}
            >
              <Animated.View style={iconStyle}>
                <Ionicons
                  name={isLastSlide ? 'checkmark' : 'arrow-forward'}
                  size={26}
                  color={Colors.white}
                />
              </Animated.View>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  topBar: {
    height: moderateScale(56),
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },
  skipButton: {
    ...Typography.label,
    color: Colors.textMuted,
    fontSize: moderateScale(14),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  slide: {
    paddingHorizontal: Theme.spacing.xxl,
    justifyContent: 'center',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconShieldBackground: {
    position: 'absolute',
    width: moderateScale(260),
    height: moderateScale(260),
    borderRadius: moderateScale(130),
    opacity: 0.5,
    transform: [{ scale: 1.1 }],
  },
  iconShield: {
    width: moderateScale(220),
    height: moderateScale(220),
    borderRadius: moderateScale(110),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Theme.shadow.floating,
    elevation: 10,
  },
  textContainer: {
    marginTop: Theme.spacing.lg,
  },
  tagBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(6),
    borderRadius: Theme.borderRadius.pill,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  tagText: {
    fontSize: moderateScale(11),
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  title: {
    ...Typography.display,
    fontSize: moderateScale(40),
    lineHeight: moderateScale(48),
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -1,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: moderateScale(16),
    lineHeight: moderateScale(26),
    marginTop: Theme.spacing.md,
    fontWeight: '500',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.xl + 10,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    height: moderateScale(6),
    borderRadius: moderateScale(3),
    marginHorizontal: moderateScale(4),
  },
  nextButtonWrapper: {
    borderRadius: moderateScale(34),
    ...Theme.shadow.floating,
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  nextButton: {
    width: moderateScale(68),
    height: moderateScale(68),
    borderRadius: moderateScale(34),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});

export default OnboardingScreen;
