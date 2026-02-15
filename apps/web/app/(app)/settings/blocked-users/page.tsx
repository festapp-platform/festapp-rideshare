"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface BlockedUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  blocked_at: string;
}

/**
 * Blocked users management page.
 * Lists all users blocked by the current user with unblock capability.
 */
export default function BlockedUsersPage() {
  const supabase = createClient();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const fetchBlockedUsers = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_blocked_users");
    if (error) {
      toast.error("Failed to load blocked users");
      setLoading(false);
      return;
    }
    setBlockedUsers((data as BlockedUser[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  async function handleUnblock(userId: string, userName: string | null) {
    setUnblocking(userId);
    // Optimistic: remove from list
    const previous = blockedUsers;
    setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));

    try {
      const { error } = await supabase.rpc("unblock_user", {
        p_blocked_id: userId,
      });
      if (error) throw error;
      toast.success(`${userName || "User"} unblocked`);
    } catch (err) {
      // Revert optimistic
      setBlockedUsers(previous);
      const message = err instanceof Error ? err.message : "Failed to unblock user";
      toast.error(message);
    } finally {
      setUnblocking(null);
    }
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-main"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Settings
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-text-main">Blocked Users</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-3 rounded-xl border border-border-pastel bg-surface p-4"
            >
              <div className="h-10 w-10 rounded-full bg-border-pastel" />
              <div className="flex-1">
                <div className="mb-1 h-4 w-32 rounded bg-border-pastel" />
                <div className="h-3 w-24 rounded bg-border-pastel" />
              </div>
            </div>
          ))}
        </div>
      ) : blockedUsers.length === 0 ? (
        <div className="rounded-2xl border border-border-pastel bg-surface p-8 text-center">
          <svg
            className="mx-auto mb-3 h-12 w-12 text-text-secondary/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
          <p className="text-sm text-text-secondary">
            You haven&apos;t blocked anyone
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {blockedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 rounded-xl border border-border-pastel bg-surface p-4"
            >
              {/* Avatar */}
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name || "User"}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light">
                  <svg
                    className="h-5 w-5 text-surface"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}

              {/* Name and date */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-text-main">
                  {user.display_name || "Unknown User"}
                </p>
                <p className="text-xs text-text-secondary">
                  Blocked on{" "}
                  {new Date(user.blocked_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Unblock button */}
              <button
                onClick={() => handleUnblock(user.id, user.display_name)}
                disabled={unblocking === user.id}
                className="rounded-lg border border-border-pastel px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-background disabled:opacity-50"
              >
                {unblocking === user.id ? "..." : "Unblock"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
