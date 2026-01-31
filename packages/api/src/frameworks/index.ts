// Base framework types and classes
export * from "./base";

// PSF Framework
export { PSFAgent, type PSFResearchResult, type PSFSynthesis } from "./psf";

// Create and configure registry with all frameworks
import type { ILogger } from "../shared/logger";
import { FrameworkRegistry, type IFrameworkRegistry } from "./base";
import { PSFAgent } from "./psf";

export function createFrameworkRegistry(logger: ILogger): IFrameworkRegistry {
  const registry = new FrameworkRegistry(logger.child({ module: "framework-registry" }));

  // Register all available frameworks
  registry.register(new PSFAgent({ logger: logger.child({ module: "psf-agent" }) }));

  // Future frameworks can be registered here:
  // registry.register(new CompetitorAgent({ logger: logger.child({ module: "competitor-agent" }) }));
  // registry.register(new MarketSizingAgent({ logger: logger.child({ module: "market-sizing-agent" }) }));

  return registry;
}
