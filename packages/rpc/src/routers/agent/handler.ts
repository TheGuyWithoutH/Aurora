import { Layer, Effect, Ref } from "effect";
import { AgentRpcs } from "./request";
import { Agent } from "@aurora/ai";
import { ConversationStorage } from "@aurora/supabase";

export const AgentLive = AgentRpcs.toLayer(
  Effect.gen(function* () {
    const agent = yield* Agent;
    const storage = yield* ConversationStorage;

    // Track conversations currently being processed to prevent concurrent requests
    const processingConversations = yield* Ref.make(new Set<string>());

    return {
      GenerateText: (payload: {
        deviceId: string;
        conversationId?: string;
        prompt: string;
        image?: string;
      }) =>
        Effect.gen(function* () {
          yield* Effect.log(
            `[GenerateText] Device: ${payload.deviceId}, Prompt: ${payload.prompt}`
          );

          // Get or create conversation
          const conversation = payload.conversationId
            ? yield* storage.getConversation(payload.conversationId)
            : yield* storage.getOrCreateConversation(payload.deviceId);

          yield* Effect.log(
            `[GenerateText] Using conversation: ${conversation.id}`
          );

          // Check if this conversation is already being processed
          const currentlyProcessing = yield* Ref.get(processingConversations);
          if (currentlyProcessing.has(conversation.id)) {
            yield* Effect.log(
              `[GenerateText] Conversation ${conversation.id} is already being processed, ignoring duplicate request`
            );
            yield* Effect.fail("Conversation is already being processed");
          }

          // Mark conversation as being processed
          yield* Ref.update(processingConversations, (set) =>
            new Set(set).add(conversation.id)
          );

          // Add user message to storage
          const userMessage = yield* storage.addMessage(
            conversation.id,
            "user",
            payload.prompt,
            payload.image
          );

          // Get conversation history for context
          const history = yield* storage.getConversationHistory(
            conversation.id,
            20 // Last 20 messages
          );

          yield* Effect.log(`[GenerateText] History length: ${history.length}`);

          // Generate response with full context using agent loop
          // You can toggle between the simple version and agent loop:
          // - generateTextWithHistory: simple text generation
          // - generateWithAgentLoop: advanced agent with tool calling
          const responseText = yield* agent.generateWithAgentLoop(
            payload.prompt,
            history.slice(0, -1), // Exclude the message we just added
            conversation.id,
            payload.deviceId,
            payload.image
          );

          // Add assistant response to storage
          const assistantMessage = yield* storage.addMessage(
            conversation.id,
            "assistant",
            responseText
          );

          yield* Effect.log(`[GenerateText] Response: ${responseText}`);

          // Release lock
          yield* Ref.update(processingConversations, (set) => {
            const newSet = new Set(set);
            newSet.delete(conversation.id);
            return newSet;
          });

          return {
            text: responseText,
            conversationId: conversation.id,
            messageId: assistantMessage.id,
          };
        }).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              // Release lock
              if (payload.conversationId) {
                yield* Ref.update(processingConversations, (set) => {
                  const newSet = new Set(set);
                  newSet.delete(payload.conversationId || "");
                  return newSet;
                });
              }

              yield* Effect.log(`[GenerateText] Error: ${error}`);
              return {
                text: `Error: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
                conversationId: "",
                messageId: "",
              };
            })
          )
        ),

      GetOrCreateConversation: (payload: { deviceId: string }) =>
        Effect.gen(function* () {
          yield* Effect.log(
            `[GetOrCreateConversation] Device: ${payload.deviceId}`
          );
          return yield* storage.getOrCreateConversation(payload.deviceId);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(`Failed to get/create conversation: ${error}`)
          )
        ),

      GetConversationsByDevice: (payload: { deviceId: string }) =>
        Effect.gen(function* () {
          yield* Effect.log(
            `[GetConversationsByDevice] Device: ${payload.deviceId}`
          );
          return yield* storage.getConversationsByDevice(payload.deviceId);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(`Failed to get conversations: ${error}`)
          )
        ),

      GetConversation: (payload: { conversationId: string }) =>
        Effect.gen(function* () {
          yield* Effect.log(
            `[GetConversation] Conversation: ${payload.conversationId}`
          );
          return yield* storage.getConversation(payload.conversationId);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(`Failed to get conversation: ${error}`)
          )
        ),

      GetMessages: (payload: { conversationId: string }) =>
        Effect.gen(function* () {
          yield* Effect.log(
            `[GetMessages] Conversation: ${payload.conversationId}`
          );
          return yield* storage.getMessages(payload.conversationId);
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(`Failed to get messages: ${error}`)
          )
        ),

      CreateConversation: (payload: {
        deviceId: string;
        metadata?: Record<string, unknown>;
      }) =>
        Effect.gen(function* () {
          yield* Effect.log(`[CreateConversation] Device: ${payload.deviceId}`);
          return yield* storage.createConversation(
            payload.deviceId,
            payload.metadata
          );
        }).pipe(
          Effect.catchAll((error) =>
            Effect.fail(`Failed to create conversation: ${error}`)
          )
        ),
    };
  })
);
