# Aurora Agent System

## Overview

Aurora now features a sophisticated **agent loop** system with **tool-calling capabilities**. The agent can reason iteratively, use tools to accomplish tasks, and even modify its own behavior.

## Architecture

### 1. Agent Loop (`packages/ai/src/agent-loop.ts`)

The agent loop implements iterative reasoning:

```typescript
// Agent can run up to maxIterations times
// Each iteration:
//   1. Agent receives user prompt + conversation history
//   2. Agent decides to either:
//      - Respond directly (loop ends)
//      - Call one or more tools (loop continues)
//   3. If tools are called, their results are fed back to the agent
//   4. Agent uses tool results to formulate final response
```

**Key Features:**

- **Iterative Reasoning**: Agent can think through complex multi-step tasks
- **Tool Selection**: Agent chooses which tools to use based on the request
- **Context Preservation**: Full conversation history maintained throughout
- **Configurable**: Max iterations and tool enablement can be customized

### 2. Tool System (`packages/ai/src/tools.ts`)

Tools are functions the agent can call to perform actions or retrieve information.

#### Built-in Tools:

##### `change_system_prompt`

Allows the agent to modify its own system prompt, changing its behavior or personality.

```typescript
// Example usage: "Act like a pirate"
// Agent calls: change_system_prompt({"newPrompt": "You are a pirate AI..."})
```

##### `search_conversations`

Searches through past conversations for specific content.

```typescript
// Example: "What did we discuss about weather last week?"
// Agent calls: search_conversations({"deviceId": "...", "query": "weather"})
```

##### `update_conversation_metadata`

Stores contextual information in conversation metadata.

```typescript
// Example: "Remember my name is Alice"
// Agent calls: update_conversation_metadata({
//   "conversationId": "...",
//   "key": "user_name",
//   "value": "Alice"
// })
```

##### `get_conversation_context`

Retrieves metadata and statistics about the current conversation.

```typescript
// Returns: conversation ID, device, message count, metadata
```

##### `calculator`

Performs mathematical calculations.

```typescript
// Example: "What's 234 * 567?"
// Agent calls: calculator({"expression": "234 * 567"})
```

### 3. Tool Call Format

The agent uses XML-style tags to call tools:

```xml
<tool>tool_name{"param1": "value1", "param2": "value2"}</tool>
```

The agent can call multiple tools in a single response:

```xml
<tool>calculator{"expression": "100 * 0.15"}</tool>
<tool>update_conversation_metadata{"key": "last_calculation", "value": "tax"}</tool>
```

## Usage

### Basic Usage (Already Enabled!)

The agent loop is **already enabled** in your RPC handler. Just send messages as usual:

```typescript
// From your Spectacles app or client
rpc.GenerateText({
  deviceId: "your-device-id",
  prompt: "Calculate 15% of $100 and remember this as a tax calculation",
  conversationId: "optional-conversation-id",
});
```

The agent will automatically:

1. Recognize it needs the calculator tool
2. Calculate the result
3. Store it in metadata
4. Respond to the user

### Toggle Agent Loop

In `packages/rpc/src/routers/agent/handler.ts`:

```typescript
// Option 1: Use agent loop (current - with tools)
const responseText =
  yield *
  agent.generateWithAgentLoop(
    payload.prompt,
    history,
    conversation.id,
    payload.deviceId,
    payload.image
  );

// Option 2: Simple text generation (no tools)
const responseText =
  yield * agent.generateTextWithHistory(payload.prompt, history, payload.image);
```

### Configuration

Customize agent behavior:

```typescript
import { AgentLoopConfig } from "@aurora/ai";

const config: AgentLoopConfig = {
  maxIterations: 5, // Max reasoning loops
  enableTools: true, // Enable/disable tools
};

agent.generateWithAgentLoop(
  prompt,
  history,
  conversationId,
  deviceId,
  config, // Custom config
  image
);
```

## Creating Custom Tools

Add new tools to `packages/ai/src/tools.ts`:

```typescript
export const myCustomTool: Tool = {
  name: "my_tool",
  description: "What this tool does and when to use it",
  parameters: {
    type: "object",
    properties: {
      param1: {
        type: "string",
        description: "Description of parameter",
      },
    },
    required: ["param1"],
  },
  execute: (args) =>
    Effect.gen(function* () {
      const param1 = args.param1 as string;

      // Your tool logic here
      // Can access ConversationStorage via yield* ConversationStorage

      return "Result message for the agent";
    }),
};

// Add to DEFAULT_TOOLS array
export const DEFAULT_TOOLS: Tool[] = [
  // ... existing tools
  myCustomTool,
];
```

## Example Interactions

### Example 1: Self-Modification

**User**: "From now on, speak like Shakespeare"

**Agent Process**:

1. Recognizes need to change behavior
2. Calls `change_system_prompt` tool
3. Updates system prompt with Shakespearean style
4. Responds: "Hark! Thy wish hath been granted. I shall hence speaketh in the manner of the Bard!"

### Example 2: Memory & Calculation

**User**: "Calculate 20% tip on $45.50 and remember my usual tip percentage"

**Agent Process**:

1. Calls `calculator({"expression": "45.50 * 0.20"})`
2. Gets result: $9.10
3. Calls `update_conversation_metadata({"key": "tip_percentage", "value": "20"})`
4. Responds: "A 20% tip on $45.50 is $9.10. I've saved your preference for 20% tips."

### Example 3: Context Retrieval

**User**: "What did I tell you about my preferences?"

**Agent Process**:

1. Calls `get_conversation_context({"conversationId": "..."})`
2. Retrieves metadata: `{"tip_percentage": "20", "user_name": "Alice"}`
3. Responds: "You prefer 20% tips and your name is Alice."

## Benefits

✅ **Agentic Behavior**: Makes decisions and takes actions autonomously  
✅ **Tool Extensibility**: Easy to add new capabilities  
✅ **Self-Modification**: Can adapt its behavior on the fly  
✅ **Memory**: Stores and retrieves context across conversations  
✅ **Transparency**: All tool calls are logged and traceable  
✅ **Error Handling**: Gracefully handles tool failures

## Advanced Features

### Tool Dependency Injection

Tools automatically receive the conversation context:

```typescript
// In your tool
execute: (args) =>
  Effect.gen(function* () {
    const storage = yield* ConversationStorage;
    const conversations = yield* storage.getConversationsByDevice(deviceId);
    // Use storage methods...
  });
```

### Iteration Tracking

Monitor agent reasoning:

```typescript
// Check logs for:
[AgentLoop] Iteration 1
[AgentLoop] Executing 2 tool(s)
[Tool: calculator] Evaluating: 100 * 0.15
[Tool: update_conversation_metadata] Setting tip_percentage=20
[AgentLoop] Iteration 2
[AgentLoop] No tools called, completing
```

### Multi-Tool Coordination

Agent can orchestrate multiple tools:

```typescript
// User: "Search our conversations for prices and calculate the average"

// Agent might:
// 1. Call search_conversations multiple times
// 2. Extract prices from results
// 3. Call calculator to get average
// 4. Respond with insights
```

## Next Steps

### Potential Tool Ideas

- **`web_search`**: Search the internet for information
- **`generate_image`**: Create images using DALL-E or similar
- **`send_notification`**: Push notifications to device
- **`schedule_reminder`**: Set timed reminders
- **`query_database`**: Run custom database queries
- **`call_api`**: Make HTTP requests to external APIs
- **`analyze_sentiment`**: Analyze emotional tone
- **`translate_text`**: Multi-language translation
- **`summarize_conversation`**: Create conversation summaries

### Integration Points

The agent system integrates with:

- **Spectacles App**: Voice commands trigger agent
- **RPC Layer**: All agent calls go through type-safe RPC
- **Supabase**: Persistent storage for conversations and metadata
- **Effect**: Type-safe error handling and dependency injection

## Troubleshooting

### Agent Not Using Tools

- Check that `enableTools: true` in config
- Verify tool documentation is clear in system prompt
- Review agent logs for reasoning

### Tool Execution Fails

- Check tool has required dependencies (e.g., ConversationStorage)
- Verify parameter types match schema
- Review Effect error handling in tool

### Infinite Loop

- Reduce `maxIterations` in config
- Ensure tools return clear success/failure messages
- Check for circular tool dependencies

## Summary

You now have a fully functional agent system that can:

- 🤖 Think iteratively to solve complex tasks
- 🛠️ Use tools to extend its capabilities
- 🧠 Modify its own behavior and memory
- 🔄 Coordinate multiple actions
- 📊 Track and explain its reasoning

The system is production-ready and already integrated into your Aurora platform!
