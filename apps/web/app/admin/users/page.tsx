"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { searchUsersForAdmin, ACCOUNT_STATUS } from "@festapp/shared";
import { Search, Users } from "lucide-react";

type UserRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  account_status: string;
  rating_avg: number;
  rating_count: number;
  completed_rides_count: number;
  created_at: string;
};

const STATUS_FILTERS: { label: string; value: string | null }[] = [
  { label: "All", value: null },
  { label: "Active", value: ACCOUNT_STATUS.ACTIVE },
  { label: "Suspended", value: ACCOUNT_STATUS.SUSPENDED },
  { label: "Banned", value: ACCOUNT_STATUS.BANNED },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-yellow-100 text-yellow-700",
  banned: "bg-red-100 text-red-700",
};

/**
 * Admin users list page (ADMN-03).
 * Search and filter users for moderation.
 */
export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Use search query builder or fetch all users
    let dbQuery;
    if (query.trim()) {
      dbQuery = searchUsersForAdmin(supabase, query.trim());
    } else {
      dbQuery = supabase
        .from("profiles")
        .select(
          "id, display_name, avatar_url, account_status, rating_avg, rating_count, completed_rides_count, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50);
    }

    if (statusFilter) {
      dbQuery = dbQuery.eq("account_status", statusFilter);
    }

    const { data } = await dbQuery;
    setUsers((data as UserRow[]) ?? []);
    setLoading(false);
  }, [query, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">
          Search and manage user accounts
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by display name..."
          className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
      </div>

      {/* Status filter */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.label}
            onClick={() => setStatusFilter(filter.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === filter.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Users list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-16">
          <Users className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No users found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  User
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-500 sm:table-cell">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-500 md:table-cell">
                  Rating
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-500 md:table-cell">
                  Rides
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-500 lg:table-cell">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    window.location.href = `/admin/users/${user.id}`;
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                          {user.display_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {user.display_name}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[user.account_status] || STATUS_COLORS.active
                      }`}
                    >
                      {user.account_status}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-gray-600 md:table-cell">
                    {user.rating_count > 0
                      ? `${Number(user.rating_avg).toFixed(1)} (${user.rating_count})`
                      : "New"}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-gray-600 md:table-cell">
                    {user.completed_rides_count}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-gray-400 lg:table-cell">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
