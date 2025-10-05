# @aurora/storage

Storage layer for Aurora using Supabase for conversation persistence.

## Features

- Device ID based authentication
- Conversation management
- Message persistence
- Full conversation history

## Database Schema

### Conversations Table

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_conversations_device_id ON conversations(device_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
```

### Messages Table

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

## Usage

```typescript
import { Supabase, ConversationStorage } from "@aurora/storage";
import { Effect, Layer } from "effect";

// Create Supabase layer
const SupabaseLive = Supabase.fromEnv;

// Use conversation storage
const program = Effect.gen(function* () {
  const storage = yield* ConversationStorage;
  
  // Get or create conversation for device
  const conversation = yield* storage.getOrCreateConversation("device-123");
  
  // Add user message
  yield* storage.addMessage(
    conversation.id,
    "user",
    "Hello, Aurora!"
  );
  
  // Get conversation history
  const history = yield* storage.getConversationHistory(conversation.id);
});

// Run with dependencies
Effect.provide(program, ConversationStorage.Live)
  .pipe(Effect.provide(SupabaseLive));
```
