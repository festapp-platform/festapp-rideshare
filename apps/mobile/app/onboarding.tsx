import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Alert,
  useColorScheme,
  ViewToken,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import {
  onboardingSteps,
  ONBOARDING_COMPLETED_KEY,
  PROFILE_ONBOARDING_COMPLETED_KEY,
  DisplayNameSchema,
  VehicleSchema,
  colors,
} from '@festapp/shared';
import type { OnboardingStep } from '@festapp/shared';
import { supabase } from '@/lib/supabase';
import { pickAndUploadAvatar, pickAndUploadVehiclePhoto } from '@/lib/image-upload';

const { width } = Dimensions.get('window');

type UserRole = 'rider' | 'driver' | 'both';

/**
 * Mobile onboarding flow with profile creation, role selection, and optional vehicle setup.
 *
 * Uses FlatList horizontal paging with scrollEnabled disabled for form steps.
 * New users: welcome -> profile -> role -> [vehicle if driver/both] -> location -> notifications -> ready
 * Existing users (old done, profile not): profile -> role -> [vehicle] -> ready
 * Fully onboarded: navigate to home
 */
export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;

  // Profile step state
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Role step state
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Vehicle step state
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  // User ID
  const [userId, setUserId] = useState<string | null>(null);

  // Filtered steps based on existing onboarding state
  const [baseSteps, setBaseSteps] = useState<OnboardingStep[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const oldDone = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      const profileDone = await AsyncStorage.getItem(PROFILE_ONBOARDING_COMPLETED_KEY);

      if (oldDone === 'true' && profileDone === 'true') {
        router.replace('/(tabs)/search');
        return;
      }

      let steps: OnboardingStep[];
      if (oldDone === 'true' && profileDone !== 'true') {
        // Existing user: only new steps + ready
        steps = onboardingSteps.filter((s) =>
          ['profile', 'role', 'vehicle', 'ready'].includes(s.id),
        );
      } else {
        // New user: full flow
        steps = [...onboardingSteps];
      }

      setBaseSteps(steps);
      setInitialized(true);
    }
    init();
  }, [router]);

  // Dynamically filter vehicle step based on role selection
  const activeSteps = useMemo(() => {
    return baseSteps.filter((s) => {
      if (s.id === 'vehicle') {
        return selectedRole === 'driver' || selectedRole === 'both';
      }
      return true;
    });
  }, [baseSteps, selectedRole]);

  const currentStep = activeSteps[currentIndex];

  // Form steps should not be swipeable
  const isFormStep = currentStep?.id === 'profile' || currentStep?.id === 'role' || currentStep?.id === 'vehicle';

  const goToNext = useCallback(() => {
    setError(null);
    const nextIndex = currentIndex + 1;
    if (nextIndex < activeSteps.length) {
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, activeSteps.length]);

  // --- Step handlers ---

  const handleProfileContinue = useCallback(async () => {
    setError(null);
    const result = DisplayNameSchema.safeParse(displayName.trim());
    if (!result.success) {
      setError('Please enter your name (1-50 characters).');
      return;
    }
    if (!userId) {
      setError('Not authenticated. Please sign in again.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', userId);

      if (updateError) throw new Error(updateError.message);
      goToNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  }, [displayName, userId, goToNext]);

  const handleAvatarPick = useCallback(async () => {
    if (!userId) return;
    try {
      const url = await pickAndUploadAvatar(userId);
      if (url) setAvatarUrl(url);
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload photo.');
    }
  }, [userId]);

  const handleRoleContinue = useCallback(async () => {
    setError(null);
    if (!selectedRole) {
      setError('Please select how you want to use Rideshare.');
      return;
    }
    if (!userId) return;

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ user_role: selectedRole })
        .eq('id', userId);

      if (updateError) throw new Error(updateError.message);
      goToNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role.');
    } finally {
      setLoading(false);
    }
  }, [selectedRole, userId, goToNext]);

  const handleVehicleAdd = useCallback(async () => {
    setError(null);
    const vehicleData = {
      make: vehicleMake.trim(),
      model: vehicleModel.trim(),
      color: vehicleColor.trim(),
      license_plate: vehiclePlate.trim(),
    };
    const result = VehicleSchema.safeParse(vehicleData);
    if (!result.success) {
      setError('Please fill in all vehicle fields.');
      return;
    }
    if (!userId) return;

    setLoading(true);
    try {
      const { data: vehicle, error: insertError } = await supabase
        .from('vehicles')
        .insert({ ...vehicleData, owner_id: userId })
        .select('id')
        .single();

      if (insertError) throw new Error(insertError.message);

      // Offer photo upload after vehicle created
      if (vehicle) {
        Alert.alert(
          'Add a photo?',
          'Would you like to add a photo of your vehicle?',
          [
            { text: 'Skip', style: 'cancel', onPress: () => goToNext() },
            {
              text: 'Add Photo',
              onPress: async () => {
                try {
                  const url = await pickAndUploadVehiclePhoto(userId, vehicle.id);
                  if (url) {
                    await supabase
                      .from('vehicles')
                      .update({ photo_url: url })
                      .eq('id', vehicle.id);
                  }
                } catch {
                  // Photo upload failed, continue anyway
                }
                goToNext();
              },
            },
          ],
        );
        setLoading(false);
        return;
      }

      goToNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add vehicle.');
    } finally {
      setLoading(false);
    }
  }, [vehicleMake, vehicleModel, vehicleColor, vehiclePlate, userId, goToNext]);

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
    await AsyncStorage.setItem(PROFILE_ONBOARDING_COMPLETED_KEY, 'true');
    router.replace('/(tabs)/search');
  }, [router]);

  const handleButtonPress = useCallback(
    (step: OnboardingStep) => {
      switch (step.id) {
        case 'profile':
          handleProfileContinue();
          break;
        case 'role':
          handleRoleContinue();
          break;
        case 'vehicle':
          handleVehicleAdd();
          break;
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
    [handleProfileContinue, handleRoleContinue, handleVehicleAdd, handleLocationPermission, handleNotificationPermission, handleGetStarted, goToNext],
  );

  const handleSkip = useCallback(() => {
    setError(null);
    goToNext();
  }, [goToNext]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // --- Role option data ---
  const roleOptions: { value: UserRole; label: string; desc: string; icon: string }[] = [
    { value: 'rider', label: 'I want to ride', desc: 'Find rides to festivals and events', icon: 'P' },
    { value: 'driver', label: 'I want to drive', desc: 'Offer rides and share your journey', icon: 'D' },
    { value: 'both', label: 'Both', desc: 'Find and offer rides', icon: 'B' },
  ];

  // --- Render each step ---
  const renderStep = useCallback(
    ({ item }: { item: OnboardingStep }) => {
      const renderStepContent = () => {
        if (item.id === 'profile') {
          return (
            <View style={{ width: '100%', paddingHorizontal: 16 }}>
              {/* Avatar */}
              <TouchableOpacity
                onPress={handleAvatarPick}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: theme.border,
                  alignSelf: 'center',
                  marginBottom: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <View style={{ width: 96, height: 96, backgroundColor: theme.primary, opacity: 0.3, borderRadius: 48 }} />
                ) : (
                  <Text style={{ color: theme.textSecondary, fontSize: 32 }}>+</Text>
                )}
              </TouchableOpacity>
              <Text style={{ textAlign: 'center', color: theme.textSecondary, fontSize: 12, marginBottom: 24 }}>
                Tap to add a photo
              </Text>

              {/* Display name */}
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500', marginBottom: 4 }}>
                Display name
              </Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={theme.textSecondary}
                maxLength={50}
                style={{
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: theme.text,
                }}
              />
            </View>
          );
        }

        if (item.id === 'role') {
          return (
            <View style={{ width: '100%', paddingHorizontal: 16, gap: 12 }}>
              {roleOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setSelectedRole(option.value)}
                  style={{
                    borderWidth: 2,
                    borderColor: selectedRole === option.value ? theme.primary : theme.border,
                    backgroundColor: selectedRole === option.value ? `${theme.primary}10` : 'transparent',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{option.label}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 2 }}>{option.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        }

        if (item.id === 'vehicle') {
          return (
            <View style={{ width: '100%', paddingHorizontal: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '500', marginBottom: 4 }}>Make</Text>
                  <TextInput
                    value={vehicleMake}
                    onChangeText={setVehicleMake}
                    placeholder="Toyota"
                    placeholderTextColor={theme.textSecondary}
                    maxLength={50}
                    style={{
                      borderWidth: 1, borderColor: theme.border, borderRadius: 8,
                      paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: theme.text,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '500', marginBottom: 4 }}>Model</Text>
                  <TextInput
                    value={vehicleModel}
                    onChangeText={setVehicleModel}
                    placeholder="Corolla"
                    placeholderTextColor={theme.textSecondary}
                    maxLength={50}
                    style={{
                      borderWidth: 1, borderColor: theme.border, borderRadius: 8,
                      paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: theme.text,
                    }}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '500', marginBottom: 4 }}>Color</Text>
                  <TextInput
                    value={vehicleColor}
                    onChangeText={setVehicleColor}
                    placeholder="Silver"
                    placeholderTextColor={theme.textSecondary}
                    maxLength={30}
                    style={{
                      borderWidth: 1, borderColor: theme.border, borderRadius: 8,
                      paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: theme.text,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '500', marginBottom: 4 }}>Plate</Text>
                  <TextInput
                    value={vehiclePlate}
                    onChangeText={setVehiclePlate}
                    placeholder="ABC-123"
                    placeholderTextColor={theme.textSecondary}
                    maxLength={20}
                    style={{
                      borderWidth: 1, borderColor: theme.border, borderRadius: 8,
                      paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: theme.text,
                    }}
                  />
                </View>
              </View>
            </View>
          );
        }

        return null;
      };

      return (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}
          style={{ width }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Illustration placeholder */}
          <View
            style={{
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: item.illustration,
              opacity: 0.3,
              marginBottom: 32,
            }}
          />

          <Text
            style={{
              fontSize: 26,
              fontWeight: '700',
              color: theme.text,
              textAlign: 'center',
              marginBottom: 12,
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
              marginBottom: 32,
              paddingHorizontal: 16,
            }}
          >
            {item.description}
          </Text>

          {/* Step-specific content */}
          {renderStepContent()}

          {/* Error message */}
          {error && (
            <Text style={{ color: '#EF4444', fontSize: 14, marginTop: 16, textAlign: 'center' }}>{error}</Text>
          )}

          {/* Main action button */}
          <TouchableOpacity
            onPress={() => handleButtonPress(item)}
            disabled={loading}
            style={{
              backgroundColor: theme.primary,
              paddingVertical: 16,
              paddingHorizontal: 48,
              borderRadius: 12,
              minWidth: 200,
              alignItems: 'center',
              marginTop: 24,
              opacity: loading ? 0.5 : 1,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
              {loading ? 'Saving...' : item.buttonText}
            </Text>
          </TouchableOpacity>

          {/* Skip option */}
          {item.skipText && (
            <TouchableOpacity onPress={handleSkip} disabled={loading} style={{ marginTop: 16, padding: 8 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{item.skipText}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      );
    },
    [theme, handleButtonPress, handleSkip, handleAvatarPick, loading, error, displayName, selectedRole, avatarUrl, vehicleMake, vehicleModel, vehicleColor, vehiclePlate, roleOptions],
  );

  if (!initialized) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        ref={flatListRef}
        data={activeSteps}
        renderItem={renderStep}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!isFormStep}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={32}
        extraData={{ currentIndex, selectedRole, error, loading }}
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
        {activeSteps.map((step, index) => (
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
    </KeyboardAvoidingView>
  );
}
