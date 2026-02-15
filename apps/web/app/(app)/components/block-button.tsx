"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface BlockButtonProps {
  userId: string;
  userName?: string;
  initialBlocked?: boolean;
  /** Callback fired after block state changes (for parent to refresh UI). */
  onBlockChange?: (blocked: boolean) => void;
}

/**
 * Block/unblock toggle button for another user.
 * Checks block status on mount and provides optimistic toggling.
 * Blocking requires confirmation; unblocking is instant.
 */
export function BlockButton({
  userId,
  userName,
  initialBlocked,
  onBlockChange,
}: BlockButtonProps) {
  const supabase = createClient();
  const [isBlocked, setIsBlocked] = useState(initialBlocked ?? false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [checked, setChecked] = useState(initialBlocked !== undefined);

  const checkBlockStatus = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId)
      .maybeSingle();

    setIsBlocked(!!data);
    setChecked(true);
  }, [supabase, userId]);

  useEffect(() => {
    if (initialBlocked === undefined) {
      checkBlockStatus();
    }
  }, [initialBlocked, checkBlockStatus]);

  async function handleBlock() {
    setShowConfirm(false);
    setIsLoading(true);
    // Optimistic
    setIsBlocked(true);

    try {
      const { error } = await supabase.rpc("block_user", {
        p_blocked_id: userId,
      });
      if (error) throw error;
      toast.success(`${userName || "User"} blocked`);
      onBlockChange?.(true);
    } catch (err) {
      // Revert optimistic
      setIsBlocked(false);
      const message = err instanceof Error ? err.message : "Failed to block user";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUnblock() {
    setIsLoading(true);
    // Optimistic
    setIsBlocked(false);

    try {
      const { error } = await supabase.rpc("unblock_user", {
        p_blocked_id: userId,
      });
      if (error) throw error;
      toast.success(`${userName || "User"} unblocked`);
      onBlockChange?.(false);
    } catch (err) {
      // Revert optimistic
      setIsBlocked(true);
      const message = err instanceof Error ? err.message : "Failed to unblock user";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (!checked) return null;

  return (
    <>
      <button
        onClick={isBlocked ? handleUnblock : () => setShowConfirm(true)}
        disabled={isLoading}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
          isBlocked
            ? "border border-border-pastel text-text-secondary hover:bg-background"
            : "text-red-600 hover:bg-red-50"
        }`}
      >
        {isLoading ? "..." : isBlocked ? "Unblock" : "Block"}
      </button>

      {/* Confirmation dialog for blocking */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-text-main">
              Block {userName || "this user"}?
            </h3>
            <p className="mb-6 text-sm text-text-secondary">
              They won&apos;t be notified, but their rides and messages will become
              invisible to you.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-border-pastel px-4 py-2.5 text-sm font-semibold text-text-main transition-colors hover:bg-background"
              >
                Cancel
              </button>
              <button
                onClick={handleBlock}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
