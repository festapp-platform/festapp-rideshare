"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "./confirm-dialog";
import { useI18n } from "@/lib/i18n/provider";

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
  const { t } = useI18n();
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
      toast.success(t("block.blocked", { name: userName || t("block.user") }));
      onBlockChange?.(true);
    } catch (err) {
      // Revert optimistic
      setIsBlocked(false);
      const message = err instanceof Error ? err.message : t("block.failedToBlock");
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
      toast.success(t("block.unblocked", { name: userName || t("block.user") }));
      onBlockChange?.(false);
    } catch (err) {
      // Revert optimistic
      setIsBlocked(true);
      const message = err instanceof Error ? err.message : t("block.failedToUnblock");
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
        {isLoading ? "..." : isBlocked ? t("block.unblock") : t("block.block")}
      </button>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleBlock}
        title={t("block.confirmTitle", { name: userName || t("block.thisUser") })}
        message={t("block.confirmMessage")}
        confirmLabel={t("block.block")}
        cancelLabel={t("common.cancel")}
        variant="danger"
      />
    </>
  );
}
