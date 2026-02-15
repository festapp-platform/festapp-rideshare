"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface SubscribeButtonProps {
  intentId: string;
  initialSubscribed: boolean;
  subscriberCount: number;
}

/**
 * Toggle button for subscribing/unsubscribing to a route intent.
 * Optimistic UI with error revert.
 */
export function SubscribeButton({
  intentId,
  initialSubscribed,
  subscriberCount,
}: SubscribeButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [count, setCount] = useState(subscriberCount);
  const [isPending, startTransition] = useTransition();

  async function toggleSubscription() {
    const wasSubscribed = subscribed;
    const prevCount = count;

    // Optimistic update
    setSubscribed(!wasSubscribed);
    setCount(wasSubscribed ? prevCount - 1 : prevCount + 1);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Revert and redirect to login
        setSubscribed(wasSubscribed);
        setCount(prevCount);
        router.push("/login");
        return;
      }

      if (wasSubscribed) {
        // Unsubscribe
        const { error } = await supabase
          .from("route_intent_subscriptions")
          .delete()
          .eq("route_intent_id", intentId)
          .eq("subscriber_id", user.id);

        if (error) throw error;
        toast.success("Unsubscribed from route");
      } else {
        // Subscribe
        const { error } = await supabase
          .from("route_intent_subscriptions")
          .insert({
            route_intent_id: intentId,
            subscriber_id: user.id,
          });

        if (error) throw error;
        toast.success("Subscribed! You will be notified when a date is confirmed.");
      }

      // Refresh server data
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      // Revert on error
      setSubscribed(wasSubscribed);
      setCount(prevCount);
      toast.error(
        err instanceof Error ? err.message : "Failed to update subscription",
      );
    }
  }

  return (
    <button
      type="button"
      onClick={toggleSubscription}
      disabled={isPending}
      className={`w-full rounded-xl px-6 py-3 text-base font-semibold transition-colors disabled:opacity-50 ${
        subscribed
          ? "border-2 border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
          : "bg-primary text-surface hover:bg-primary/90"
      }`}
    >
      {subscribed ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Subscribed
        </span>
      ) : (
        "Subscribe to this route"
      )}
    </button>
  );
}
