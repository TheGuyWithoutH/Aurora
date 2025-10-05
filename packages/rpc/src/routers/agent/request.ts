// request.ts
import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";
import { Conversation, Message } from "@aurora/schema";

// Define a group of RPCs for agent and conversation management.
export class AgentRpcs extends RpcGroup.make(
  // Generate text with conversation persistence
  Rpc.make("GenerateText", {
    success: Schema.Struct({
      text: Schema.String,
      conversationId: Schema.String,
      messageId: Schema.String,
    }),
    error: Schema.Any,
    payload: {
      deviceId: Schema.String,
      conversationId: Schema.optional(Schema.String), // Optional: will get or create if not provided
      prompt: Schema.String,
      image: Schema.optional(Schema.String), // Base64 encoded image for context
    },
  }),

  // Get or create a conversation for a device
  Rpc.make("GetOrCreateConversation", {
    success: Conversation,
    error: Schema.String,
    payload: {
      deviceId: Schema.String,
    },
  }),

  // Get all conversations for a device
  Rpc.make("GetConversationsByDevice", {
    success: Schema.Array(Conversation),
    error: Schema.String,
    payload: {
      deviceId: Schema.String,
    },
  }),

  // Get a specific conversation
  Rpc.make("GetConversation", {
    success: Conversation,
    error: Schema.String,
    payload: {
      conversationId: Schema.String,
    },
  }),

  // Get messages for a conversation
  Rpc.make("GetMessages", {
    success: Schema.Array(Message),
    error: Schema.String,
    payload: {
      conversationId: Schema.String,
    },
  }),

  // Create a new conversation (starts fresh)
  Rpc.make("CreateConversation", {
    success: Conversation,
    error: Schema.String,
    payload: {
      deviceId: Schema.String,
      metadata: Schema.optional(
        Schema.Record({ key: Schema.String, value: Schema.Unknown })
      ),
    },
  })
) {}
