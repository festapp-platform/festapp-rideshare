/**
 * Onboarding step definitions and copy for Festapp Rideshare.
 *
 * Defines the post-signup onboarding flow:
 * 1. Welcome (ONBR-01): Value proposition
 * 2. Location Permission (ONBR-05): Contextual location request
 * 3. Notifications Permission (ONBR-06): Contextual notification request
 * 4. Ready (ONBR-07): Final step to enter the app
 */

export type OnboardingStepType = 'welcome' | 'location' | 'notifications' | 'ready';

export interface OnboardingStep {
  id: OnboardingStepType;
  title: string;
  description: string;
  buttonText: string;
  skipText?: string;
  illustration: string; // Placeholder color for illustration background
}

export const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

export const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Festapp Rideshare',
    description:
      'Share rides to festivals, save money, and meet fellow music lovers. Finding and offering rides has never been easier.',
    buttonText: 'Next',
    illustration: '#B8ACE0', // primaryLight
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
