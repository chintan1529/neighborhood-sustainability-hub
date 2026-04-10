// ============================================================================
// Centralized Environment Variable Validation
// Validates all required env vars at import time using Zod.
// Import from '@/lib/env' instead of using process.env.X! directly.
// ============================================================================

import { z } from 'zod';

// ── Schema for server-only variables ──
const serverSchema = z.object({
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
    HUGGING_FACE_API_TOKEN: z.string().optional(),
    GOOGLE_GEMINI_API_KEY: z.string().optional(),
    PREDICTION_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),
    PREDICTION_TARGET_HOURS: z.coerce.number().positive().default(24),
    PREDICTION_FEEDBACK_HOURS: z.coerce.number().positive().default(24),
    PREDICTION_PAI_DECAY: z.coerce.number().min(0).max(1).default(0.85),
    PREDICTION_PAI_WINDOW: z.coerce.number().int().positive().default(10),
    PREDICTION_PAI_TARGET: z.coerce.number().min(0).max(1).default(0.8),
});

// ── Schema for public (browser-safe) variables ──
const publicSchema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
    NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
});

// ── Parse public env (safe for both server & client) ──
function getPublicEnv() {
    const result = publicSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    });

    if (!result.success) {
        const formatted = result.error.flatten().fieldErrors;
        console.error('❌ Missing or invalid public environment variables:', formatted);
        throw new Error(`Invalid public env vars: ${Object.keys(formatted).join(', ')}`);
    }

    return result.data;
}

// ── Parse server env (only available server-side) ──
function getServerEnv() {
    // Guard: don't parse on client
    if (typeof window !== 'undefined') {
        throw new Error('Server env vars must not be accessed in the browser');
    }

    const result = serverSchema.safeParse({
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        HUGGING_FACE_API_TOKEN: process.env.HUGGING_FACE_API_TOKEN,
        GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
        PREDICTION_CONFIDENCE_THRESHOLD: process.env.PREDICTION_CONFIDENCE_THRESHOLD,
        PREDICTION_TARGET_HOURS: process.env.PREDICTION_TARGET_HOURS,
        PREDICTION_FEEDBACK_HOURS: process.env.PREDICTION_FEEDBACK_HOURS,
        PREDICTION_PAI_DECAY: process.env.PREDICTION_PAI_DECAY,
        PREDICTION_PAI_WINDOW: process.env.PREDICTION_PAI_WINDOW,
        PREDICTION_PAI_TARGET: process.env.PREDICTION_PAI_TARGET,
    });

    if (!result.success) {
        const formatted = result.error.flatten().fieldErrors;
        console.error('❌ Missing or invalid server environment variables:', formatted);
        throw new Error(`Invalid server env vars: ${Object.keys(formatted).join(', ')}`);
    }

    return result.data;
}

/**
 * Public environment variables (safe for client & server).
 * Validated at import time.
 */
export const publicEnv = getPublicEnv();

/**
 * Server-only environment variables.
 * Lazily evaluated to avoid errors when imported in client bundles
 * that tree-shake away the actual usage.
 */
let _serverEnv: z.infer<typeof serverSchema> | null = null;
export function serverEnv() {
    if (!_serverEnv) {
        _serverEnv = getServerEnv();
    }
    return _serverEnv;
}
