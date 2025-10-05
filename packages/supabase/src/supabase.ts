import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Context, Effect, Layer } from "effect";

// Supabase Configuration
export interface SupabaseConfig {
  readonly url: string;
  readonly key: string;
}

// Supabase Service
export class Supabase extends Context.Tag("Supabase")<
  Supabase,
  SupabaseClient
>() {
  static Live = (config: SupabaseConfig) =>
    Layer.succeed(
      this,
      createClient(config.url, config.key, {
        auth: {
          persistSession: false,
        },
      })
    );

  static fromEnv = Layer.effect(
    this,
    Effect.gen(function* () {
      const url = process.env.SUPABASE_URL;
      // Use SERVICE_ROLE_KEY for server-side operations (bypasses RLS)
      // Falls back to ANON_KEY if SERVICE_ROLE_KEY is not set
      const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

      if (!url || !key) {
        yield* Effect.fail(
          new Error(
            "SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variables must be set"
          )
        );
      }

      return createClient(url!, key!, {
        auth: {
          persistSession: false,
        },
      });
    })
  );
}
