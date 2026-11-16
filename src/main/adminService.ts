/**
 * Admin Service - Secure Supabase Admin Operations
 *
 * This module runs in Electron's main process (Node.js context) and handles
 * privileged database operations that require the service role key.
 *
 * SECURITY: The service role key is NEVER exposed to the renderer process.
 * All admin operations are proxied through IPC handlers.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ipcMain } from 'electron';
import log from 'electron-log';
import { z } from 'zod';
import { getEffectiveConfig } from './serverConfig';

// SECURITY: No hardcoded service role key. Must be configured via
// saved server config OR SUPABASE_SERVICE_ROLE_KEY environment variable.

let supabaseAdmin: SupabaseClient | null = null;

/**
 * Initialize or reinitialize the admin client
 * Called on startup and can be called again if configuration changes
 */
function initAdminClient(): void {
  // Get config (prioritizes saved config over env vars)
  const config = getEffectiveConfig();

  const supabaseUrl = config?.supabaseUrl || process.env.SUPABASE_URL;
  // Service role key must come from env var only — never stored in client config
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Initialize admin client only if we have the required config
  if (supabaseUrl && supabaseServiceRoleKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    log.info('[AdminService] Secure admin client initialized in main process');
  } else {
    log.warn(
      '[AdminService] Service role key not configured - admin operations disabled',
    );
  }
}

// Initialize on module load
initAdminClient();

/**
 * Create a new user with email/password authentication
 * This is a privileged operation that requires the service role key
 */
interface CreateUserParams {
  email: string;
  password: string;
  fullName: string;
  role: string;
}

const createUserParamsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(60),
});
const adminAvailabilitySchema = z.boolean();
const createUserResultSchema = z.object({
  success: z.boolean(),
  userId: z.string().uuid().optional(),
  error: z.string().optional(),
});
const adminOperationResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

function parseAdminOutput<T>(
  schema: z.ZodType<T>,
  value: unknown,
  channel: string,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    log.error(
      `[AdminService] ${channel} generated invalid response payload`,
      parsed.error.format(),
    );
    throw new Error(`Invalid ${channel} response payload`);
  }
  return parsed.data;
}

interface CreateUserResult {
  success: boolean;
  userId?: string;
  error?: string;
}

async function createAuthUser(
  params: CreateUserParams,
): Promise<CreateUserResult> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error:
        'Admin client not configured. Service role key is required for user creation.',
    };
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true, // Auto-confirm email for internal staff
      user_metadata: {
        full_name: params.fullName,
        role: params.role,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      userId: data.user?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error creating user',
    };
  }
}

/**
 * Delete a user from authentication system
 * This is a privileged operation that requires the service role key
 */
interface DeleteUserResult {
  success: boolean;
  error?: string;
}

async function deleteAuthUser(userId: string): Promise<DeleteUserResult> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error:
        'Admin client not configured. Service role key is required for user deletion.',
    };
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error deleting user',
    };
  }
}

/**
 * Update user metadata or email
 */
interface UpdateUserParams {
  userId: string;
  email?: string;
  password?: string;
  userMetadata?: Record<string, unknown>;
}

const updateUserParamsSchema = z
  .object({
    userId: z.string().uuid(),
    email: z.string().email().max(254).optional(),
    password: z.string().min(8).max(128).optional(),
    userMetadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((val) => !!(val.email || val.password || val.userMetadata), {
    message: 'At least one field must be provided for update',
    path: ['email'],
  });

const deleteUserIdSchema = z.string().uuid();

interface UpdateUserResult {
  success: boolean;
  error?: string;
}

async function updateAuthUser(
  params: UpdateUserParams,
): Promise<UpdateUserResult> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error:
        'Admin client not configured. Service role key is required for user updates.',
    };
  }

  try {
    const updateData: {
      email?: string;
      password?: string;
      user_metadata?: Record<string, unknown>;
    } = {};

    if (params.email) updateData.email = params.email;
    if (params.password) updateData.password = params.password;
    if (params.userMetadata) updateData.user_metadata = params.userMetadata;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      params.userId,
      updateData,
    );

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error updating user',
    };
  }
}

/**
 * Check if admin service is available
 */
function isAdminAvailable(): boolean {
  return supabaseAdmin !== null;
}

/**
 * Register IPC handlers for admin operations
 * These handlers proxy requests from the renderer process to the secure admin client
 */
export function registerAdminHandlers(): void {
  log.info('[AdminService] Registering IPC handlers');

  // Check admin availability
  ipcMain.handle('admin:isAvailable', () => {
    return parseAdminOutput(
      adminAvailabilitySchema,
      isAdminAvailable(),
      'admin:isAvailable',
    );
  });

  // Create user
  ipcMain.handle('admin:createUser', async (_event, rawParams: unknown) => {
    const parsed = createUserParamsSchema.safeParse(rawParams);
    if (!parsed.success) {
      return {
        success: false,
        error: `Invalid admin:createUser payload: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
      };
    }

    log.debug('[AdminService] Creating user:', parsed.data.email);
    return parseAdminOutput(
      createUserResultSchema,
      await createAuthUser(parsed.data),
      'admin:createUser',
    );
  });

  // Delete user
  ipcMain.handle('admin:deleteUser', async (_event, rawUserId: unknown) => {
    const parsed = deleteUserIdSchema.safeParse(rawUserId);
    if (!parsed.success) {
      return {
        success: false,
        error: `Invalid admin:deleteUser payload: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
      };
    }

    log.debug('[AdminService] Deleting user:', parsed.data);
    return parseAdminOutput(
      adminOperationResultSchema,
      await deleteAuthUser(parsed.data),
      'admin:deleteUser',
    );
  });

  // Update user
  ipcMain.handle('admin:updateUser', async (_event, rawParams: unknown) => {
    const parsed = updateUserParamsSchema.safeParse(rawParams);
    if (!parsed.success) {
      return {
        success: false,
        error: `Invalid admin:updateUser payload: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
      };
    }

    log.debug('[AdminService] Updating user:', parsed.data.userId);
    return parseAdminOutput(
      adminOperationResultSchema,
      await updateAuthUser(parsed.data),
      'admin:updateUser',
    );
  });

  log.info('[AdminService] IPC handlers registered');
}

export { isAdminAvailable };
