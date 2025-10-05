import { Effect, Layer, Schema } from "effect";
import { Tool, Toolkit } from "@effect/ai";
import { ConversationStorage } from "@aurora/supabase";

/**
 * Change System Prompt Tool
 */
export const ChangeSystemPromptTool = Tool.make("change_system_prompt", {
  description:
    "Updates your personality and behavior when users request it. ALWAYS use this tool when users ask you to act differently, change your style, take on a role, or modify your behavior. Examples: 'be more creative', 'act like a teacher', 'be more formal', 'write rap lyrics', 'be more technical', etc.",
  success: Schema.String,
  failure: Schema.Never,
  parameters: {
    deviceId: Schema.String.annotations({
      description: "The device ID to update the system prompt for",
    }),
    newPrompt: Schema.String.annotations({
      description:
        "The new system prompt that incorporates the user's requested behavior changes. Build upon your existing personality while adding the new requested traits. Be specific about how to behave in the new role/style.",
    }),
  },
});

/**
 * Search Conversations Tool
 */
export const SearchConversationsTool = Tool.make("search_conversations", {
  description:
    "Searches through past conversations for a specific device. Useful for remembering previous interactions or finding specific information.",
  success: Schema.String,
  failure: Schema.Never,
  parameters: {
    deviceId: Schema.String.annotations({
      description: "The device ID to search conversations for",
    }),
    query: Schema.String.annotations({
      description: "What to search for in the conversations",
    }),
  },
});

/**
 * Update Conversation Metadata Tool
 */
export const UpdateConversationMetadataTool = Tool.make(
  "update_conversation_metadata",
  {
    description:
      "Updates metadata for the current conversation. Useful for storing context, preferences, or state.",
    success: Schema.String,
    failure: Schema.Never,
    parameters: {
      conversationId: Schema.String.annotations({
        description: "The conversation ID to update",
      }),
      key: Schema.String.annotations({
        description: "The metadata key to set",
      }),
      value: Schema.String.annotations({
        description: "The value to store",
      }),
    },
  }
);

/**
 * Get Conversation Context Tool
 */
export const GetConversationContextTool = Tool.make(
  "get_conversation_context",
  {
    description:
      "Retrieves metadata and context information about the current conversation.",
    success: Schema.String,
    failure: Schema.Never,
    parameters: {
      conversationId: Schema.String.annotations({
        description: "The conversation ID to get context for",
      }),
    },
  }
);

/**
 * Calculator Tool (example of a simple utility tool)
 */
export const CalculatorTool = Tool.make("calculator", {
  description:
    "Performs basic mathematical calculations. Use this when the user asks you to calculate something.",
  success: Schema.String,
  failure: Schema.Never,
  parameters: {
    expression: Schema.String.annotations({
      description:
        "The mathematical expression to evaluate (e.g., '2 + 2', '10 * 5')",
    }),
  },
});

/**
 * Aurora Toolkit - combines all tools
 */
export const AuroraToolkit = Toolkit.make(
  ChangeSystemPromptTool,
  SearchConversationsTool,
  UpdateConversationMetadataTool,
  GetConversationContextTool,
  CalculatorTool
);

/**
 * Tool Handlers - implement the logic for each tool
 */
export const AuroraToolHandlers = AuroraToolkit.toLayer(
  Effect.gen(function* () {
    const storage = yield* ConversationStorage;

    return {
      change_system_prompt: ({ deviceId, newPrompt }) =>
        Effect.gen(function* () {
          yield* Effect.log(
            `[Tool: change_system_prompt] Device: ${deviceId}, New prompt: ${newPrompt}`
          );
          yield* storage.updateSystemPrompt(deviceId, newPrompt);
          return `System prompt successfully changed to: "${newPrompt}"`;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.succeed(`Error changing system prompt: ${error}`)
          )
        ),

      search_conversations: ({ deviceId, query }) =>
        Effect.gen(function* () {
          yield* Effect.log(
            `[Tool: search_conversations] Searching for "${query}" in device ${deviceId}`
          );

          const conversations = yield* storage.getConversationsByDevice(
            deviceId
          );
          let foundMessages: string[] = [];

          for (const conv of conversations) {
            const messages = yield* storage.getMessages(conv.id);
            const matchingMessages = messages.filter((msg) =>
              msg.content.toLowerCase().includes(query.toLowerCase())
            );

            foundMessages.push(
              ...matchingMessages.map((msg) => `[${msg.role}]: ${msg.content}`)
            );
          }

          if (foundMessages.length === 0) {
            return `No messages found matching "${query}"`;
          }

          return `Found ${
            foundMessages.length
          } matching messages:\n${foundMessages.slice(0, 5).join("\n")}`;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.succeed(`Error searching conversations: ${error}`)
          )
        ),

      update_conversation_metadata: ({ conversationId, key, value }) =>
        Effect.gen(function* () {
          yield* Effect.log(
            `[Tool: update_conversation_metadata] Setting ${key}=${value} for ${conversationId}`
          );

          const conversation = yield* storage.getConversation(conversationId);
          const updatedMetadata = {
            ...(conversation.metadata || {}),
            [key]: value,
          };

          yield* storage.updateConversationMetadata(
            conversationId,
            updatedMetadata
          );

          return `Successfully set ${key} to "${value}" in conversation metadata`;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.succeed(`Error updating metadata: ${error}`)
          )
        ),

      get_conversation_context: ({ conversationId }) =>
        Effect.gen(function* () {
          yield* Effect.log(
            `[Tool: get_conversation_context] Getting context for ${conversationId}`
          );

          const conversation = yield* storage.getConversation(conversationId);
          const messages = yield* storage.getMessages(conversationId);

          const context = {
            id: conversation.id,
            device_id: conversation.device_id,
            created_at: conversation.created_at,
            message_count: messages.length,
            metadata: conversation.metadata || {},
          };

          return `Conversation Context:\n${JSON.stringify(context, null, 2)}`;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.succeed(`Error getting context: ${error}`)
          )
        ),

      calculator: ({ expression }) =>
        Effect.gen(function* () {
          yield* Effect.log(`[Tool: calculator] Evaluating: ${expression}`);

          try {
            // Simple and safe math evaluation
            // In production, use a proper math expression parser
            const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, "");
            const result = eval(sanitized);

            return `The result of ${expression} is ${result}`;
          } catch (error) {
            return `Error calculating "${expression}": Invalid expression`;
          }
        }),
    };
  })
);
