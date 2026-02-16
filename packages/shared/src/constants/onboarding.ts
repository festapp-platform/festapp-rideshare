/**
 * Onboarding step definitions and copy for Festapp Rideshare.
 *
 * Defines the post-signup onboarding flow:
 * 1. Welcome (ONBR-01): Value proposition
 * 2. Profile (ONBR-02): Name + photo setup
 * 3. Role (ONBR-03): Rider/driver/both selection
 * 4. Vehicle (ONBR-04): Optional vehicle setup (if driver/both)
 * 5. Location Permission (ONBR-05): Contextual location request
 * 6. Notifications Permission (ONBR-06): Contextual notification request
 * 7. Ready (ONBR-07): Final step to enter the app
 */

export type OnboardingStepType =
  | 'welcome'
  | 'profile'
  | 'role'
  | 'vehicle'
  | 'location'
  | 'notifications'
  | 'ready';

export interface OnboardingStep {
  id: OnboardingStepType;
  title: string;
  description: string;
  buttonText: string;
  skipText?: string;
  illustration: string; // Placeholder color for illustration background
}

export const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

/**
 * Separate key for profile onboarding completion (backward compat).
 * Existing users who completed old onboarding keep their state,
 * but will be prompted for the new profile/role steps.
 */
export const PROFILE_ONBOARDING_COMPLETED_KEY = 'profile_onboarding_completed';

export const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to spolujizda.online',
    description:
      'Share rides to festivals, save money, and meet fellow music lovers. Finding and offering rides has never been easier.',
    buttonText: 'Next',
    illustration: '#B8ACE0', // primaryLight
  },
  {
    id: 'profile',
    title: 'Set up your profile',
    description:
      'Add your name and photo so others know who they are riding with.',
    buttonText: 'Continue',
    illustration: '#A8D8B9',
  },
  {
    id: 'role',
    title: 'How will you use Rideshare?',
    description:
      'Let us know if you want to offer rides, find rides, or both. You can change this anytime.',
    buttonText: 'Continue',
    illustration: '#F4C2C2',
  },
  {
    id: 'vehicle',
    title: 'Add your vehicle',
    description:
      'Add your car details so passengers know what to look for. You can skip this and add later from your profile.',
    buttonText: 'Add Vehicle',
    skipText: 'Skip for now',
    illustration: '#B5D5E8',
  },
  {
    id: 'location',
    title: 'Find rides near you',
    description:
      'Enable location access so we can show you rides and pickup points nearby. You can always change this in Settings later.',
    buttonText: 'Enable Location',
    skipText: 'Skip',
    illustration: '#6BA3A0', // secondary
  },
  {
    id: 'notifications',
    title: 'Never miss a ride',
    description:
      'Get notified about booking confirmations, ride reminders, and messages from your driver or passengers.',
    buttonText: 'Enable Notifications',
    skipText: 'Skip',
    illustration: '#E8A87C', // accent
  },
  {
    id: 'ready',
    title: "You're all set!",
    description:
      'Start by searching for a ride to your next festival, or post your own ride to share with others.',
    buttonText: 'Get Started',
    illustration: '#7BC67E', // success
  },
];
