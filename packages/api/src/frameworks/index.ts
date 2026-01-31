// Base framework types and classes
export * from "./base";

// Create and configure registry with all frameworks
import type { ILogger } from "../shared/logger";
import { FrameworkRegistry, type IFrameworkRegistry } from "./base";

export function createFrameworkRegistry(logger: ILogger): IFrameworkRegistry {
  const registry = new FrameworkRegistry(logger.child({ module: "framework-registry" }));

  // Register frameworks here as they are implemented:
  // registry.register(new PSFAgent({ logger: logger.child({ module: "psf-agent" }) }));
  // registry.register(new CompetitorAgent({ logger: logger.child({ module: "competitor-agent" }) }));

  return registry;
}
