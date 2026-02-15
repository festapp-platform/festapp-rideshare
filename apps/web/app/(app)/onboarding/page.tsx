'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  onboardingSteps,
  ONBOARDING_COMPLETED_KEY,
} from '@festapp/shared';
import type { OnboardingStep } from '@festapp/shared';

/**
 * Web onboarding flow (ONBR-01, ONBR-06, ONBR-07).
 *
 * Simplified version for web:
 * - Welcome with value prop
 * - Notification permission via browser Notification API
 * - Location not requested during web onboarding (browser prompts when needed)
 * - Get Started saves completion to localStorage
 */
export default function OnboardingPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  // Filter steps for web: skip location (browser handles it contextually)
  const webSteps = onboardingSteps.filter((s) => s.id !== 'location');
  const currentStep = webSteps[currentIndex];

  const goToNext = useCallback(() => {
    if (currentIndex < webSteps.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, webSteps.length]);

  const handleNotificationPermission = useCallback(async () => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } catch {
      // Permission request failed, continue anyway
    }
    goToNext();
  }, [goToNext]);

  const handleGetStarted = useCallback(() => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    router.push('/search');
  }, [router]);

  const handleButtonPress = useCallback(
    (step: OnboardingStep) => {
      switch (step.id) {
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
    [handleNotificationPermission, handleGetStarted, goToNext],
  );

  if (!currentStep) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {/* Illustration placeholder */}
        <div
          className="mx-auto mb-12 h-48 w-48 rounded-full opacity-30"
          style={{ backgroundColor: currentStep.illustration }}
        />

        <h1 className="mb-4 text-3xl font-bold text-foreground">
          {currentStep.title}
        </h1>

        <p className="mb-12 text-base leading-relaxed text-muted-foreground">
          {currentStep.description}
        </p>

        {/* Main action button */}
        <button
          onClick={() => handleButtonPress(currentStep)}
          className="inline-block min-w-48 rounded-xl bg-primary px-12 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90"
        >
          {currentStep.buttonText}
        </button>

        {/* Skip option for permission steps */}
        {currentStep.skipText && (
          <button
            onClick={goToNext}
            className="mt-4 block w-full p-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {currentStep.skipText}
          </button>
        )}

        {/* Step indicators */}
        <div className="mt-12 flex justify-center gap-2">
          {webSteps.map((step, index) => (
            <div
              key={step.id}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-6 bg-primary'
                  : 'w-2 bg-border'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
