# Storage Package

This package provides conversation persistence using Supabase.

## Architecture

- **Supabase**: Manages Supabase client connection
- **ConversationStorage**: Handles all conversation and message operations

## Key Features

1. Device-based authentication
2. Automatic conversation creation
3. Full message history persistence
4. Image support for multimodal conversations

## Database Design

Two tables: `conversations` and `messages` with proper foreign key relationships and indexes for performance.
