import {
  HttpMiddleware,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
  Headers,
} from "@effect/platform";
import { RpcSerialization, RpcServer } from "@effect/rpc";
import { Handlers, Rpcs } from "@aurora/rpc";
import { Effect, flow, Layer, Option } from "effect";

const corsMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const origin = Headers.get(request.headers, "origin").pipe(
      Option.getOrUndefined
    );

    const response = yield* app;

    if (!origin) {
      return response;
    }

    return response.pipe(
      HttpServerResponse.setHeader("Access-Control-Allow-Origin", origin),
      HttpServerResponse.setHeader("Access-Control-Allow-Credentials", "true"),
      HttpServerResponse.setHeader(
        "Access-Control-Allow-Headers",
        "traceparent, content-type, b3"
      )
    );
  })
);

export const middleware = flow(
  corsMiddleware,
  HttpMiddleware.xForwardedHeaders
);

const optionsEndpoint = Effect.gen(function* () {
  const response = yield* HttpServerResponse.empty({
    status: 204,
  });
  return response;
});

export const OPTIONSRoutes = HttpRouter.empty.pipe(
  HttpRouter.options("/api/internal/rpc", optionsEndpoint)
);

export const POSTRoutes = HttpRouter.empty.pipe(
  HttpRouter.post(
    "/api/internal/rpc",
    RpcServer.toHttpApp(Rpcs).pipe(
      Effect.provide(Handlers),
      Effect.provide(RpcSerialization.layerJson),
      Effect.tapDefect((error) =>
        Effect.annotateCurrentSpan({
          error: `[MICHAELTEST] DEFECT: ${error}`,
        })
      ),
      Effect.tapErrorCause((error) =>
        Effect.annotateCurrentSpan({
          error: `[MICHAELTEST] CAUSE: ${error}`,
        })
      ),
      Effect.flatten
    )
  )
);

export const Server = HttpRouter.concatAll(POSTRoutes, OPTIONSRoutes).pipe(
  middleware
);
