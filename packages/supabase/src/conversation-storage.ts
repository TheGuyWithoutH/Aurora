import { Context, Effect, Layer } from "effect";
import { Supabase } from "./supabase";
import type { Message, Conversation } from "@aurora/schema";

// Database types for Supabase
export interface DbDeviceSettings {
  id: string;
  device_id: string;
  system_prompt: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface DbConversation {
  id: string;
  device_id: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  image?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

// Conversation Storage Service
export class ConversationStorage extends Context.Tag("ConversationStorage")<
  ConversationStorage,
  {
    // Device Settings
    readonly getDeviceSettings: (
      deviceId: string
    ) => Effect.Effect<DbDeviceSettings, Error>;

    readonly getSystemPrompt: (
      deviceId: string
    ) => Effect.Effect<string, Error>;

    readonly updateSystemPrompt: (
      deviceId: string,
      systemPrompt: string
    ) => Effect.Effect<string, Error>;

    // Create a new conversation for a device
    readonly createConversation: (
      deviceId: string,
      metadata?: Record<string, unknown>
    ) => Effect.Effect<Conversation, Error>;

    // Get or create a conversation for a device (returns latest active conversation)
    readonly getOrCreateConversation: (
      deviceId: string
    ) => Effect.Effect<Conversation, Error>;

    // Get all conversations for a device
    readonly getConversationsByDevice: (
      deviceId: string
    ) => Effect.Effect<Conversation[], Error>;

    // Get a specific conversation by ID
    readonly getConversation: (
      conversationId: string
    ) => Effect.Effect<Conversation, Error>;

    // Add a message to a conversation
    readonly addMessage: (
      conversationId: string,
      role: "user" | "assistant" | "system",
      content: string,
      image?: string,
      metadata?: Record<string, unknown>
    ) => Effect.Effect<Message, Error>;

    // Get all messages for a conversation
    readonly getMessages: (
      conversationId: string
    ) => Effect.Effect<Message[], Error>;

    // Get conversation history (for AI context)
    readonly getConversationHistory: (
      conversationId: string,
      limit?: number
    ) => Effect.Effect<
      Array<{
        role: "user" | "assistant" | "system";
        content: string;
        image?: string;
      }>,
      Error
    >;

    // Update conversation metadata
    readonly updateConversationMetadata: (
      conversationId: string,
      metadata: Record<string, unknown>
    ) => Effect.Effect<Conversation, Error>;
  }
>() {
  static Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const supabase = yield* Supabase;

      const DEFAULT_SYSTEM_PROMPT =
        "You are Aurora, a helpful AI assistant responding in short sentences for voice conversations (1 or 2 sentences). You are friendly, helpful, and maintain context across the conversation.";

      const getDeviceSettings = (deviceId: string) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.tryPromise({
            try: () =>
              supabase
                .from("device_settings")
                .select()
                .eq("device_id", deviceId)
                .maybeSingle(),
            catch: (e) => new Error(String(e)),
          });

          if (error) {
            yield* Effect.fail(
              new Error(`Failed to get device settings: ${error.message}`)
            );
          }

          if (data) {
            return data as DbDeviceSettings;
          }

          // Create default settings if none exist
          const now = new Date().toISOString();
          const { data: newData, error: insertError } =
            yield* Effect.tryPromise({
              try: () =>
                supabase
                  .from("device_settings")
                  .insert({
                    device_id: deviceId,
                    system_prompt: DEFAULT_SYSTEM_PROMPT,
                    created_at: now,
                    updated_at: now,
                    metadata: {},
                  })
                  .select()
                  .single(),
              catch: (e) => new Error(String(e)),
            });

          if (insertError) {
            yield* Effect.fail(
              new Error(
                `Failed to create device settings: ${insertError.message}`
              )
            );
          }

          return newData as DbDeviceSettings;
        });

      const getSystemPrompt = (deviceId: string) =>
        Effect.gen(function* () {
          const settings = yield* getDeviceSettings(deviceId);
          return settings.system_prompt;
        });

      const updateSystemPrompt = (deviceId: string, systemPrompt: string) =>
        Effect.gen(function* () {
          const now = new Date().toISOString();
          const { data, error } = yield* Effect.tryPromise({
            try: () =>
              supabase
                .from("device_settings")
                .update({
                  system_prompt: systemPrompt,
                  updated_at: now,
                })
                .eq("device_id", deviceId)
                .select()
                .single(),
            catch: (e) => new Error(String(e)),
          });

          if (error) {
            yield* Effect.fail(
              new Error(`Failed to update system prompt: ${error.message}`)
            );
          }

          return (data as DbDeviceSettings).system_prompt;
        });

      const createConversation = (
        deviceId: string,
        metadata?: Record<string, unknown>
      ) =>
        Effect.gen(function* () {
          const now = new Date().toISOString();
          const { data, error } = yield* Effect.tryPromise({
            try: () =>
              supabase
                .from("conversations")
                .insert({
                  device_id: deviceId,
                  created_at: now,
                  updated_at: now,
                  metadata: metadata || {},
                })
                .select()
                .single(),
            catch: (e) => new Error(String(e)),
          });

          if (error) {
            yield* Effect.fail(
              new Error(`Failed to create conversation: ${error.message}`)
            );
          }

          return {
            id: data!.id,
            device_id: data!.device_id,
            created_at: data!.created_at,
            updated_at: data!.updated_at,
            metadata: data!.metadata,
          } as Conversation;
        });

      const getOrCreateConversation = (deviceId: string) =>
        Effect.gen(function* () {
          // Try to get the latest conversation for this device
          const { data, error } = yield* Effect.tryPromise({
            try: () =>
              supabase
                .from("conversations")
                .select()
                .eq("device_id", deviceId)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
            catch: (e) => new Error(String(e)),
          });

          if (error) {
            yield* Effect.fail(
              new Error(`Failed to get conversation: ${error.message}`)
            );
          }

          if (data) {
            return {
              id: data.id,
              device_id: data.device_id,
              created_at: data.created_at,
              updated_at: data.updated_at,
              metadata: data.metadata,
            } as Conversation;
          }

          // Create new conversation if none exists
          return yield* createConversation(deviceId);
        });

      const getConversationsByDevice = (deviceId: string) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.tryPromise({
            try: () =>
              supabase
                .from("conversations")
                .select()
                .eq("device_id", deviceId)
                .order("updated_at", { ascending: false }),
            catch: (e) => new Error(String(e)),
          });

          if (error) {
            yield* Effect.fail(
              new Error(`Failed to get conversations: ${error.message}`)
            );
          }

          return (
            data?.map(
              (d) =>
                ({
                  id: d.id,
                  device_id: d.device_id,
                  created_at: d.created_at,
                  updated_at: d.updated_at,
                  metadata: d.metadata,
                } as Conversation)
            ) || []
          );
        });

      const getConversation = (conversationId: string) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.tryPromise({
            try: () =>
              supabase
                .from("conversations")
                .select()
                .eq("id", conversationId)
                .single(),
            catch: (e) => new Error(String(e)),
          });

          if (error) {
            yield* Effect.fail(
              new Error(`Failed to get conversation: ${error.message}`)
            );
          }

          return {
            id: data!.id,
            device_id: data!.device_id,
            created_at: data!.created_at,
            updated_at: data!.updated_at,
            metadata: data!.metadata,
          } as Conversation;
        });

      const addMessage = (
        conversationId: string,
        role: "user" | "assistant" | "system",
        content: string,
        image?: string,
        metadata?: Record<string, unknown>
      ) =>
        Effect.gen(function* () {
          const now = new Date().toISOString();

          // Insert message
          const { data: messageData, error: messageError } =
            yield* Effect.tryPromise({
              try: () =>
                supabase
                  .from("messages")
                  .insert({
                    conversation_id: conversationId,
                    role,
                    content,
                    image,
                    created_at: now,
                    metadata: metadata || {},
                  })
                  .select()
                  .single(),
              catch: (e) => new Error(String(e)),
            });

          if (messageError) {
            yield* Effect.fail(
              new Error(`Failed to add message: ${messageError.message}`)
            );
          }

          // Update conversation's updated_at timestamp
          yield* Effect.tryPromise({
            try: () =>
              supabase
                .from("conversations")
                .update({ updated_at: now })
                .eq("id", conversationId),
            catch: (e) => new Error(String(e)),
          });

          return {
            id: messageData!.id,
            conversation_id: messageData!.conversation_id,
            role: messageData!.role,
            content: messageData!.content,
            image: messageData!.image,
            created_at: messageData!.created_at,
            metadata: messageData!.metadata,
          } as Message;
        });

      const getMessages = (conversationId: string) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.tryPromise({
            try: () =>
              supabase
                .from("messages")
                .select()
                .eq("conversation_id", conversationId)
                .order("created_at", { ascending: true }),
            catch: (e) => new Error(String(e)),
          });

          if (error) {
            yield* Effect.fail(
              new Error(`Failed to get messages: ${error.message}`)
            );
          }

          return (
            data?.map(
              (d) =>
                ({
                  id: d.id,
                  conversation_id: d.conversation_id,
                  role: d.role,
                  content: d.content,
                  image: d.image,
                  created_at: d.created_at,
                  metadata: d.metadata,
                } as Message)
            ) || []
          );
        });

      const getConversationHistory = (conversationId: string, limit?: number) =>
        Effect.gen(function* () {
          const query = supabase
            .from("messages")
            .select("role, content, image")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

          if (limit) {
            query.limit(limit);
          }

          const { data, error } = yield* Effect.tryPromise({
            try: () => query,
            catch: (e) => new Error(String(e)),
          });

          if (error) {
            yield* Effect.fail(
              new Error(`Failed to get conversation history: ${error.message}`)
            );
          }

          return (
            data?.map((d) => ({
              role: d.role as "user" | "assistant" | "system",
              content: d.content,
              image: d.image,
            })) || []
          );
        });

      const updateConversationMetadata = (
        conversationId: string,
        metadata: Record<string, unknown>
      ) =>
        Effect.gen(function* () {
          const now = new Date().toISOString();
          const { data, error } = yield* Effect.tryPromise({
            try: () =>
              supabase
                .from("conversations")
                .update({
                  metadata,
                  updated_at: now,
                })
                .eq("id", conversationId)
                .select()
                .single(),
            catch: (e) => new Error(String(e)),
          });

          if (error) {
            yield* Effect.fail(
              new Error(
                `Failed to update conversation metadata: ${error.message}`
              )
            );
          }

          return {
            id: data!.id,
            device_id: data!.device_id,
            created_at: data!.created_at,
            updated_at: data!.updated_at,
            metadata: data!.metadata,
          } as Conversation;
        });

      return {
        getDeviceSettings,
        getSystemPrompt,
        updateSystemPrompt,
        createConversation,
        getOrCreateConversation,
        getConversationsByDevice,
        getConversation,
        addMessage,
        getMessages,
        getConversationHistory,
        updateConversationMetadata,
      };
    })
  );
}
