/**
 * Set admin flag on a Supabase user via the Admin API.
 *
 * Usage:
 *   npx tsx supabase/scripts/set-admin.ts [email]
 *
 * Environment variables (reads from process.env or .env.local):
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

// Try loading .env.local if dotenv is available
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv');
  dotenv.config({ path: '.env.local' });
} catch {
  // dotenv not installed -- rely on process.env
}

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function setAdmin(email: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
        'Set them in your environment or in .env.local.',
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // List users and find by email
  const {
    data: { users },
    error: listError,
  } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('Failed to list users:', listError.message);
    process.exit(1);
  }

  const user = users.find((u) => u.email === email);
  if (!user) {
    console.error(
      `User ${email} not found. They must sign up first.`,
    );
    process.exit(1);
  }

  // Set admin flag, preserving existing app_metadata
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, is_admin: true },
  });

  if (error) {
    console.error('Failed to set admin:', error.message);
    process.exit(1);
  }

  console.log(
    `Successfully set is_admin=true for ${email} (id: ${user.id})`,
  );
}

const email = process.argv[2] || 'bujnmi@gmail.com';
setAdmin(email);
