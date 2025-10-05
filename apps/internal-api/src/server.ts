import { HttpServer } from "@effect/platform";
import { Layer } from "effect";
import { Server } from ".";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Agent } from "@aurora/ai";
import { NodeHttpClient } from "@effect/platform-node";
import { Supabase, ConversationStorage } from "@aurora/supabase";

// Create the main server layer with all dependencies
const HttpLive = HttpServer.serve(Server).pipe(
  HttpServer.withLogAddress,
  // Provide AI agent
  Layer.provide(Agent.Live),
  // Provide storage layer
  Layer.provide(ConversationStorage.Live),
  Layer.provide(Supabase.fromEnv),
  // Provide HTTP client
  Layer.provide(NodeHttpClient.layer),
  // Provide HTTP server
  Layer.provide(BunHttpServer.layer({ port: 3002 }))
);

BunRuntime.runMain(Layer.launch(HttpLive));
