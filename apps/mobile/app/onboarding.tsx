import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Alert,
  useColorScheme,
  ViewToken,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import {
  onboardingSteps,
  ONBOARDING_COMPLETED_KEY,
  colors,
} from '@festapp/shared';
import type { OnboardingStep } from '@festapp/shared';

const { width } = Dimensions.get('window');

/**
 * Multi-step onboarding flow for mobile (ONBR-01, ONBR-05, ONBR-06, ONBR-07).
 *
 * Horizontal swipeable FlatList with:
 * - Welcome screen with value prop
 * - Location permission request with contextual explanation
 * - Notification permission request with contextual explanation
 * - Ready screen that saves completion and navigates to home
 */
export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  const goToNext = useCallback(() => {
    if (currentIndex < onboardingSteps.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex]);

  const handleLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location not enabled',
          'You can enable location later in Settings to find nearby rides.',
          [{ text: 'OK' }],
        );
      }
    } catch {
      // Permission request failed, continue anyway
    }
    goToNext();
  }, [goToNext]);

  const handleNotificationPermission = useCallback(async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Notifications not enabled',
          'You can enable notifications later in Settings to get ride updates.',
          [{ text: 'OK' }],
        );
      }
    } catch {
      // Permission request failed, continue anyway
    }
    goToNext();
  }, [goToNext]);

  const handleGetStarted = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    router.replace('/(tabs)/search');
  }, [router]);

  const handleButtonPress = useCallback(
    (step: OnboardingStep) => {
      switch (step.id) {
        case 'location':
          handleLocationPermission();
          break;
        case 'notifications':
          handleNotificationPermission();
          break;
        case 'ready':
          handleGetStarted();
          break;
        default:
          goToNext();
      }
    },
    [handleLocationPermission, handleNotificationPermission, handleGetStarted, goToNext],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderStep = useCallback(
    ({ item }: { item: OnboardingStep }) => (
      <View style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        {/* Illustration placeholder */}
        <View
          style={{
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: item.illustration,
            opacity: 0.3,
            marginBottom: 48,
          }}
        />

        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: theme.text,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          {item.title}
        </Text>

        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: theme.textSecondary,
            textAlign: 'center',
            marginBottom: 48,
            paddingHorizontal: 16,
          }}
        >
          {item.description}
        </Text>

        {/* Main action button */}
        <TouchableOpacity
          onPress={() => handleButtonPress(item)}
          style={{
            backgroundColor: theme.primary,
            paddingVertical: 16,
            paddingHorizontal: 48,
            borderRadius: 12,
            minWidth: 200,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            {item.buttonText}
          </Text>
        </TouchableOpacity>

        {/* Skip option for permission steps */}
        {item.skipText && (
          <TouchableOpacity onPress={goToNext} style={{ marginTop: 16, padding: 8 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{item.skipText}</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [theme, handleButtonPress, goToNext],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        ref={flatListRef}
        data={onboardingSteps}
        renderItem={renderStep}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={32}
      />

      {/* Step indicators (dots) */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          paddingBottom: 48,
          gap: 8,
        }}
      >
        {onboardingSteps.map((step, index) => (
          <View
            key={step.id}
            style={{
              width: index === currentIndex ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: index === currentIndex ? theme.primary : theme.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}
