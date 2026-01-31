import type { ILogger } from "../../shared/logger";
import type { IResearchFramework, FrameworkTypeInfo } from "./framework.types";

export class FrameworkAlreadyRegisteredError extends Error {
  constructor(type: string) {
    super(`Framework type '${type}' is already registered`);
    this.name = "FrameworkAlreadyRegisteredError";
  }
}

export class FrameworkNotFoundError extends Error {
  constructor(type: string) {
    super(`Framework type '${type}' is not registered`);
    this.name = "FrameworkNotFoundError";
  }
}

export interface IFrameworkRegistry {
  register(framework: IResearchFramework): void;
  get<T = unknown>(type: string): IResearchFramework<T> | undefined;
  has(type: string): boolean;
  getAll(): IResearchFramework[];
  listTypes(): FrameworkTypeInfo[];
}

export class FrameworkRegistry implements IFrameworkRegistry {
  private readonly frameworks = new Map<string, IResearchFramework>();
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  register(framework: IResearchFramework): void {
    if (this.frameworks.has(framework.type)) {
      throw new FrameworkAlreadyRegisteredError(framework.type);
    }
    this.frameworks.set(framework.type, framework);
    this.logger.info("Framework registered", { type: framework.type, name: framework.name });
  }

  get<T = unknown>(type: string): IResearchFramework<T> | undefined {
    return this.frameworks.get(type) as IResearchFramework<T> | undefined;
  }

  has(type: string): boolean {
    return this.frameworks.has(type);
  }

  getAll(): IResearchFramework[] {
    return Array.from(this.frameworks.values());
  }

  listTypes(): FrameworkTypeInfo[] {
    return this.getAll().map((f) => ({
      type: f.type,
      name: f.name,
      description: f.description,
    }));
  }
}
