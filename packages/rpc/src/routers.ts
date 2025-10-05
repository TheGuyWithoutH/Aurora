import { Layer } from "effect";
import { AgentLive } from "./routers/agent/handler";
import { AgentRpcs } from "./routers/agent/request";

export const Rpcs = AgentRpcs.merge();
export const RPCRoutes = Rpcs; // Alias for backward compatibility

export const Handlers = Layer.mergeAll(AgentLive);
export const Handler = Handlers; // Alias for backward compatibility
