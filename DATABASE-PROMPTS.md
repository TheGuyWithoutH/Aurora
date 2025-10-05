# Database-Persisted System Prompts

## Overview

The Aurora agent system now **persists system prompts per device in the database** instead of using in-memory `Ref`s. This allows each device to have its own customizable system prompt that persists across sessions.

## Changes Made

### 1. New Database Table: `device_settings`

Added a new table to store device-specific configuration:

```sql
CREATE TABLE device_settings (
  id UUID PRIMARY KEY,
  device_id TEXT UNIQUE NOT NULL,
  system_prompt TEXT NOT NULL DEFAULT 'You are Aurora...',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);
```

**Features:**

- ✅ One system prompt per device (unique constraint on `device_id`)
- ✅ Automatic timestamps with triggers
- ✅ Default system prompt for new devices
- ✅ Extensible metadata field for future customizations

### 2. ConversationStorage Updates

Added three new methods to `ConversationStorage`:

#### `getDeviceSettings(deviceId: string)`

Fetches device settings, creating default settings if none exist.

#### `getSystemPrompt(deviceId: string)`

Retrieves just the system prompt for a device.

#### `updateSystemPrompt(deviceId: string, systemPrompt: string)`

Updates the system prompt for a specific device.

### 3. Tool Integration

The `change_system_prompt` tool now requires a `deviceId` parameter:

```typescript
// Old (in-memory):
change_system_prompt({ newPrompt });

// New (database-persisted):
change_system_prompt({ deviceId, newPrompt });
```

The tool automatically provides the `deviceId` from the conversation context, so users can still just say "act like a pirate" without specifying their device ID.

### 4. Agent Methods Updated

All agent methods now accept a `deviceId` parameter:

```typescript
// Old signatures:
generateText(prompt, image?)
generateTextWithHistory(prompt, history, image?)
generateWithAgentLoop(prompt, history, conversationId, image?)

// New signatures:
generateText(prompt, deviceId, image?)
generateTextWithHistory(prompt, history, deviceId, image?)
generateWithAgentLoop(prompt, history, conversationId, deviceId, image?)
```

The agent fetches the device-specific system prompt from the database before generating each response.

## Usage

### Database Setup

Run the updated SQL in your Supabase SQL Editor:

```bash
# The file is located at:
supabase-setup.sql
```

This will create the `device_settings` table with proper indexes and RLS policies.

### Agent Behavior

When a device first interacts with Aurora:

1. System checks if device settings exist
2. If not, creates default settings with standard system prompt
3. All subsequent requests use the stored system prompt

### Changing System Prompt

Users can change their device's system prompt via conversation:

**User**: "From now on, act like a pirate"

**Agent Process**:

1. Recognizes intent to change behavior
2. Calls `change_system_prompt` tool with deviceId + new prompt
3. Updates database: `UPDATE device_settings SET system_prompt = 'You are a pirate AI...' WHERE device_id = '...'`
4. Future conversations use the new prompt

### Programmatic Access

You can also update system prompts programmatically:

```typescript
import { ConversationStorage } from "@aurora/supabase";

// Update system prompt
await storage.updateSystemPrompt(
  "device-123",
  "You are a professional medical assistant..."
);

// Get current prompt
const currentPrompt = await storage.getSystemPrompt("device-123");
```

## Benefits

### ✅ Persistence

System prompts survive server restarts and redeploys.

### ✅ Per-Device Customization

Each device can have its own unique personality and behavior.

### ✅ Audit Trail

`updated_at` timestamps track when prompts were changed.

### ✅ Scalability

Database storage scales better than in-memory state.

### ✅ Multi-Instance Support

Works correctly with multiple server instances (no shared memory issues).

### ✅ Metadata Extensibility

The `metadata` JSON field allows storing additional device-specific config:

- Language preferences
- Verbosity settings
- Feature flags
- User preferences

## Example Scenarios

### Scenario 1: Personal Assistant

**User**: "Remember, I prefer short, bullet-point responses"  
**Tool Call**: `update_conversation_metadata({ key: "response_style", value: "bullet_points" })`  
**User**: "Actually, change your entire personality to be more formal"  
**Tool Call**: `change_system_prompt({ deviceId: "...", newPrompt: "You are a formal, professional assistant..." })`

### Scenario 2: Multi-User Household

- **Device A** (Dad's phone): Professional, business-focused Aurora
- **Device B** (Kid's tablet): Friendly, educational Aurora with kid-safe language
- **Device C** (Mom's phone): Creative, brainstorming-focused Aurora

Each maintains its own system prompt in the database.

### Scenario 3: Testing & Development

Developers can quickly test different personalities:

```typescript
// Test customer service personality
await storage.updateSystemPrompt(device, CS_PROMPT);

// Test technical support personality
await storage.updateSystemPrompt(device, TECH_PROMPT);

// Reset to default
await storage.updateSystemPrompt(device, DEFAULT_PROMPT);
```

## Migration from In-Memory

If you had devices using the old in-memory system:

1. They'll automatically get default settings on next interaction
2. No data loss - conversations and messages are unaffected
3. Users can immediately customize their new persistent prompts

## Database Schema

```
device_settings
├── id (UUID, PK)
├── device_id (TEXT, UNIQUE) ← Key for lookups
├── system_prompt (TEXT) ← The AI's personality
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ) ← Auto-updated on changes
└── metadata (JSONB) ← Extensible config

Index: idx_device_settings_device_id ON (device_id)
```

## API Reference

### ConversationStorage Methods

```typescript
// Get full device settings
getDeviceSettings(deviceId: string): Effect<DbDeviceSettings, Error>

// Get just the system prompt
getSystemPrompt(deviceId: string): Effect<string, Error>

// Update the system prompt
updateSystemPrompt(deviceId: string, systemPrompt: string): Effect<string, Error>
```

### Default System Prompt

```typescript
const DEFAULT_SYSTEM_PROMPT =
  "You are Aurora, a helpful AI assistant responding in short sentences for voice conversations. You are friendly, helpful, and maintain context across the conversation.";
```

## Future Enhancements

Potential additions to device_settings:

- `voice_settings`: Speed, pitch, accent preferences
- `language`: Preferred language for responses
- `tools_enabled`: Which tools are available for this device
- `privacy_mode`: Whether to log conversations
- `max_context_length`: How much history to include
- `model_preferences`: Which AI model to use

## Troubleshooting

### Device not getting custom prompt

- Check database connection
- Verify device_id is being passed correctly
- Check Supabase RLS policies allow access

### Prompt not persisting

- Verify `update_system_prompt` completed successfully
- Check for database write errors in logs
- Ensure `updated_at` trigger is working

### Multiple devices sharing prompt

- Verify each device has unique `device_id`
- Check for race conditions in device creation

## Summary

✨ **System prompts are now first-class, persistent configuration** stored per device in Supabase, enabling true multi-device personalization that survives restarts and scales horizontally!
