import { Schema } from "effect";

// Conversation Schema
export class Conversation extends Schema.Class<Conversation>("Conversation")({
  id: Schema.String,
  device_id: Schema.String,
  created_at: Schema.String,
  updated_at: Schema.String,
  metadata: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Unknown })
  ),
}) {}

// Message Schema
export class Message extends Schema.Class<Message>("Message")({
  id: Schema.String,
  conversation_id: Schema.String,
  role: Schema.Literal("user", "assistant", "system"),
  content: Schema.String,
  image: Schema.optional(Schema.String), // Base64 encoded image
  created_at: Schema.String,
  metadata: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Unknown })
  ),
}) {}

// Create Conversation Request
export class CreateConversationRequest extends Schema.Class<CreateConversationRequest>(
  "CreateConversationRequest"
)({
  device_id: Schema.String,
  metadata: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Unknown })
  ),
}) {}

// Add Message Request
export class AddMessageRequest extends Schema.Class<AddMessageRequest>(
  "AddMessageRequest"
)({
  conversation_id: Schema.String,
  role: Schema.Literal("user", "assistant", "system"),
  content: Schema.String,
  image: Schema.optional(Schema.String),
  metadata: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Unknown })
  ),
}) {}

export const ConversationSchema = Schema.Array(Conversation);
export const MessageSchema = Schema.Array(Message);
