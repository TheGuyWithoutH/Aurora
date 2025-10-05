import { Effect } from "effect";
import { LanguageModel } from "@effect/ai";
import type { MessageEncoded } from "@effect/ai/Prompt";
import { AuroraToolkit } from "./tools";

/**
 * Helper to build conversation history with system prompt
 */
export const buildPromptWithHistory = (
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

/**
 * Generate text with agent loop and tools
 * Effect AI automatically handles tool calling loop!
 */
export const generateWithAgentLoop = (
  prompt: string,
  history: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    image?: string;
  }>,
  systemPrompt: string,
  image?: string,
  maxIterations: number = 5
) =>
  Effect.gen(function* () {
    yield* Effect.log(
      `[Agent Loop] Starting with max ${maxIterations} iterations`
    );
    yield* Effect.log(
      `[Agent Loop] Initial prompt (${
        history.length
      } messages): ${prompt.substring(0, 100)}...`
    );

    // Build a mutable conversation history for the loop
    let currentHistory = [...history];
    let iteration = 0;
    let finalText = "";

    while (iteration < maxIterations) {
      iteration++;
      yield* Effect.log(`[Agent Loop] Iteration ${iteration}/${maxIterations}`);

      // Generate response with toolkit
      const response = yield* LanguageModel.generateText({
        prompt: buildPromptWithHistory(
          prompt,
          currentHistory,
          systemPrompt,
          iteration === 1 ? image : undefined // Only include image on first iteration
        ),
        toolkit: AuroraToolkit,
      });

      yield* Effect.log(
        `[Agent Loop] Response text: ${
          response.text ? response.text.substring(0, 200) : "(empty)"
        }...`
      );
      yield* Effect.log(
        `[Agent Loop] Tool calls: ${response.toolCalls?.length ?? 0}`
      );
      yield* Effect.log(
        `[Agent Loop] Tool results: ${response.toolResults?.length ?? 0}`
      );

      // If there are no tool calls, we have our final response
      if (!response.toolCalls || response.toolCalls.length === 0) {
        yield* Effect.log(`[Agent Loop] No tool calls, final response ready`);
        finalText = response.text;
        break;
      }

      // Tool calls were made - add them to history and continue loop
      yield* Effect.log(
        `[Agent Loop] ${response.toolCalls.length} tool(s) called, adding to history and continuing...`
      );

      // Add assistant's response with tool calls to history
      if (response.text) {
        currentHistory.push({
          role: "assistant",
          content: response.text,
        });
      }

      // Add tool results as user message to simulate the AI seeing the results
      if (response.toolResults && response.toolResults.length > 0) {
        const toolResultsText = response.toolResults
          .map((result, idx) => {
            const toolCall = response.toolCalls![idx];
            return `Result from ${toolCall?.name}: ${result}`;
          })
          .join("\n");

        // Add as user message to simulate the AI receiving the tool results
        currentHistory.push({
          role: "user",
          content: `Here are the results from the tools you just used:\n\n${toolResultsText}\n\nPlease provide a natural response to my original question based on these results. Do not call any more tools.`,
        });

        yield* Effect.log(
          `[Agent Loop] Added tool results to history: ${toolResultsText.substring(
            0,
            200
          )}...`
        );
      }
    }

    if (iteration >= maxIterations) {
      yield* Effect.log(
        `[Agent Loop] Max iterations reached without final response`
      );
      finalText =
        finalText ||
        "I tried to help but encountered complexity. Could you rephrase your request?";
    }

    yield* Effect.log(
      `[Agent Loop] Complete after ${iteration} iterations. Final text: ${finalText.substring(
        0,
        200
      )}...`
    );

    return finalText;
  });
