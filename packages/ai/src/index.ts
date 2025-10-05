import {
  OpenRouterClient,
  OpenRouterLanguageModel,
} from "@effect/ai-openrouter";
import { LanguageModel } from "@effect/ai";
import { Context, Effect, Layer, Redacted } from "effect";
import type { HttpClient } from "@effect/platform/HttpClient";
import type { AiError } from "@effect/ai/AiError";
import type { MessageEncoded } from "@effect/ai/Prompt";
import { ConversationStorage } from "@aurora/supabase";
import { AuroraToolHandlers, AuroraToolkit } from "./tools";
import {
  buildPromptWithHistory,
  generateWithAgentLoop as generateWithAgentLoopHelper,
} from "./agent-loop";

// Export tool types and utilities
export * from "./tools";
export * from "./agent-loop";

// Helper to convert history to prompt format (without tools)
const buildSimplePrompt = (
  prompt: string,
  history: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    image?: string;
  }>,
  systemPrompt: string,
  currentImage?: string
): MessageEncoded[] => {
  const messages: MessageEncoded[] = [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    // Add conversation history
    ...history.map((msg): MessageEncoded => {
      switch (msg.role) {
        case "user":
          return {
            role: "user" as const,
            content: [
              {
                type: "text",
                text: msg.content,
              },
            ],
          };
        case "assistant":
          return {
            role: "assistant" as const,
            content: [
              {
                type: "text",
                text: msg.content,
              },
            ],
          };
        case "system":
          return {
            role: "system" as const,
            content: msg.content,
          };
      }
    }),
    // Add current prompt
    {
      role: "user" as const,
      content: [
        { type: "text", text: prompt },
        ...(currentImage
          ? [
              {
                type: "file" as const,
                data: `data:image/jpeg;base64,${currentImage}`,
                mediaType: "image/jpeg",
              },
            ]
          : []),
      ],
    },
  ];

  return messages;
};

// Simple text generation (no tools)
const generateText = (prompt: string, systemPrompt: string, image?: string) =>
  Effect.gen(function* () {
    yield* Effect.log(`Generating text: ${prompt}`);
    const response = yield* LanguageModel.generateText({
      prompt: buildSimplePrompt(prompt, [], systemPrompt, image),
    });
    return response.text;
  }).pipe(
    Effect.tap((text) => Effect.log(`Generated text: ${text}`)),
    Effect.tapErrorCause((error) =>
      Effect.log(`Error generating text: ${error}`)
    )
  );

// Text generation with history (no tools)
const generateTextWithHistory = (
  prompt: string,
  history: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    image?: string;
  }>,
  systemPrompt: string,
  image?: string
) =>
  Effect.gen(function* () {
    yield* Effect.log(
      `Generating text with history (${history.length} messages): ${prompt}`
    );
    const response = yield* LanguageModel.generateText({
      prompt: buildSimplePrompt(prompt, history, systemPrompt, image),
    });
    return response.text;
  }).pipe(
    Effect.tap((text) => Effect.log(`Generated text: ${text}`)),
    Effect.tapErrorCause((error) =>
      Effect.log(`Error generating text: ${error}`)
    )
  );

// Create a `Model` which provides a concrete implementation of
// `LanguageModel` and requires an `OpenAiClient`
const GrokModel = OpenRouterLanguageModel.model("x-ai/grok-4-fast", {});
const OpenRouter = OpenRouterClient.layer({
  apiKey: Redacted.make(
    "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"
  ),
});

const makeAgent = Effect.gen(function* () {
  const storage = yield* ConversationStorage;

  const agent = {
    generateText: (prompt: string, deviceId: string, image?: string) =>
      Effect.gen(function* () {
        const systemPrompt = yield* storage.getSystemPrompt(deviceId);
        return yield* generateText(prompt, systemPrompt, image).pipe(
          Effect.provide(GrokModel),
          Effect.provide(OpenRouter)
        );
      }) as Effect.Effect<string, AiError, HttpClient>,
    generateTextWithHistory: (
      prompt: string,
      history: Array<{
        role: "user" | "assistant" | "system";
        content: string;
        image?: string;
      }>,
      deviceId: string,
      image?: string
    ) =>
      Effect.gen(function* () {
        const systemPrompt = yield* storage.getSystemPrompt(deviceId);
        return yield* generateTextWithHistory(
          prompt,
          history,
          systemPrompt,
          image
        ).pipe(Effect.provide(GrokModel), Effect.provide(OpenRouter));
      }) as Effect.Effect<string, AiError, HttpClient>,
    // New agent loop method with tools!
    generateWithAgentLoop: (
      prompt: string,
      history: Array<{
        role: "user" | "assistant" | "system";
        content: string;
        image?: string;
      }>,
      conversationId: string,
      deviceId: string,
      image?: string
    ) =>
      Effect.gen(function* () {
        const systemPrompt = yield* storage.getSystemPrompt(deviceId);
        return yield* generateWithAgentLoopHelper(
          prompt,
          history,
          systemPrompt,
          image
        ).pipe(
          Effect.provide(AuroraToolHandlers),
          Effect.provide(GrokModel),
          Effect.provide(OpenRouter)
        );
      }) as Effect.Effect<string, AiError, HttpClient>,
  };

  return agent as typeof agent & {
    readonly [K in keyof typeof agent]: (typeof agent)[K];
  };
});

export class Agent extends Context.Tag("Agent")<
  Agent,
  {
    readonly generateText: (
      prompt: string,
      deviceId: string,
      image?: string
    ) => Effect.Effect<string, AiError, HttpClient>;
    readonly generateTextWithHistory: (
      prompt: string,
      history: Array<{
        role: "user" | "assistant" | "system";
        content: string;
        image?: string;
      }>,
      deviceId: string,
      image?: string
    ) => Effect.Effect<string, AiError, HttpClient>;
    // generateWithAgentLoop requires ConversationStorage for tool handlers
    readonly generateWithAgentLoop: (
      prompt: string,
      history: Array<{
        role: "user" | "assistant" | "system";
        content: string;
        image?: string;
      }>,
      conversationId: string,
      deviceId: string,
      image?: string
    ) => Effect.Effect<string, AiError, HttpClient>;
  }
>() {
  // Note: This Live layer requires ConversationStorage to be provided by the consumer
  // (it's needed for fetching device-specific system prompts and tool handlers)
  static Live = Layer.effect(this, makeAgent);
}
