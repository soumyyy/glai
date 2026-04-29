import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { getSupabaseConfig } from '../config';
import { deleteLocalAccountData } from '../db/account';
import { getDb } from '../db/schema';
import { getSetting, setSetting } from '../db/settings';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { syncAllProfiles, syncPendingMeals } from './sync';
import { getSupabaseClient } from './client';

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function debugAuthLog(message: string, payload?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  if (payload) {
    console.log(message, payload);
    return;
  }

  console.log(message);
}

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signInWithGoogleIdToken(input: { idToken: string; accessToken?: string | null }): Promise<Session> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: input.idToken,
    access_token: input.accessToken ?? undefined,
  });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error('Google sign-in completed without a Supabase session.');
  }

  return data.session;
}

export function getAuthRedirectUri(): string {
  return makeRedirectUri({
    path: 'auth/callback',
    native: 'glai://auth/callback',
  });
}

export async function createSessionFromUrl(url: string): Promise<Session | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) {
    throw new Error(errorCode);
  }

  const accessToken = typeof params.access_token === 'string' ? params.access_token : null;
  const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : null;

  if (!accessToken || !refreshToken) {
    return null;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signInWithGoogleOAuth(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const redirectTo = getAuthRedirectUri();
  debugAuthLog('[Auth] google-oauth:start', { redirectTo });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  const authUrl = data?.url;
  if (!authUrl) {
    throw new Error('Supabase did not return a Google auth URL.');
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
  debugAuthLog('[Auth] google-oauth:result', { type: result.type });
  if (result.type !== 'success') {
    return null;
  }

  return createSessionFromUrl(result.url);
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function deleteAccount(): Promise<void> {
  const supabase = getSupabaseClient();
  const config = getSupabaseConfig();
  if (!supabase || !config) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const session = data.session;
  if (!session) {
    throw new Error('No active session.');
  }

  const response = await fetch(`${config.url}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || 'Account deletion failed.');
  }

  deleteLocalAccountData(session.user.id);

  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (signOutError) {
    console.warn('[Auth] local sign-out after delete failed', describeError(signOutError));
  }

  useProfileStore.getState().clear();
  useAuthStore.getState().clearSession();
}

export function subscribeToAuthChanges(
  callback: (event: AuthChangeEvent, session: Session | null) => void | Promise<void>,
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return () => undefined;
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    void callback(event, session);
  });

  return () => data.subscription.unsubscribe();
}

export async function runFirstSignInMigration(session: Session): Promise<void> {
  const accountId = session.user.id;
  const migrationKey = `auth_migrated:${accountId}`;
  const db = getDb();

  const nullAccountCount = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM users WHERE account_id IS NULL`,
  )?.count ?? 0;
  const nullUpdatedProfiles = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM users WHERE updated_at IS NULL`,
  )?.count ?? 0;
  const nullUpdatedMeals = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM meals WHERE updated_at IS NULL`,
  )?.count ?? 0;
  const nullPendingDeletes = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM pending_deletes WHERE account_id IS NULL`,
  )?.count ?? 0;

  const alreadyMigrated = getSetting(migrationKey) === 'true';
  const needsMigration =
    !alreadyMigrated ||
    nullAccountCount > 0 ||
    nullUpdatedProfiles > 0 ||
    nullUpdatedMeals > 0 ||
    nullPendingDeletes > 0;

  if (!needsMigration) {
    return;
  }

  db.execSync('BEGIN IMMEDIATE TRANSACTION');
  try {
    db.runSync(
      `UPDATE users
       SET account_id = ?, updated_at = COALESCE(updated_at, created_at)
       WHERE account_id IS NULL`,
      [accountId],
    );
    db.runSync(
      `UPDATE users
       SET updated_at = COALESCE(updated_at, created_at)
       WHERE account_id = ?`,
      [accountId],
    );
    db.runSync(
      `UPDATE meals
       SET updated_at = COALESCE(updated_at, created_at)
       WHERE updated_at IS NULL`,
    );
    db.runSync(
      `UPDATE pending_deletes
       SET account_id = ?
       WHERE account_id IS NULL`,
      [accountId],
    );
    db.execSync('COMMIT');
  } catch (error) {
    db.execSync('ROLLBACK');
    throw error;
  }

  try {
    await syncAllProfiles();
    await syncPendingMeals();
  } catch (error) {
    console.warn('[Auth] first-sign-in migration sync failed', describeError(error));
  }

  setSetting(migrationKey, 'true');
  setSetting('auth_migrated', 'true');
}
