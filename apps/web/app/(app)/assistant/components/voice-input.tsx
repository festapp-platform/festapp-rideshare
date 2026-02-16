"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  lang?: string;
  disabled?: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Get the SpeechRecognition constructor from the window object.
 * Returns null if not available (SSR or unsupported browser).
 */
function getSpeechRecognition(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ??
    (window as any).webkitSpeechRecognition ??
    null
  );
}

/**
 * Microphone button using the Web Speech API for voice-to-text input.
 *
 * Visual states:
 * - Idle: gray mic icon
 * - Recording: red pulsing mic icon with "Listening..." text
 * - Error: toast notification via sonner
 *
 * Hides the button if the browser does not support speech recognition.
 */
export function VoiceInput({
  onTranscript,
  lang = "cs-CZ",
  disabled = false,
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Check for Web Speech API support
  useEffect(() => {
    setIsSupported(!!getSpeechRecognition());
  }, []);

  const startRecording = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      toast.error("Voice input not supported in this browser");
      return;
    }

    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        onTranscript(transcript);
      }
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "aborted") {
        toast.error(`Voice input error: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [lang, onTranscript]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  if (!isSupported) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {isRecording && (
        <span className="text-xs font-medium text-red-500 animate-pulse">
          Listening...
        </span>
      )}
      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled}
        title={isRecording ? "Stop recording" : "Voice input"}
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
          isRecording
            ? "bg-red-500 text-white animate-pulse"
            : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
        } disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
          />
        </svg>
      </button>
    </div>
  );
}
