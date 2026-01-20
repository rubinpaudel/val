import prisma from "@val/db";
import { Logger, type ILogger } from "../shared/logger";
import {
  ProjectRepository,
  type IProjectRepository,
} from "../modules/project/project.repository";
import {
  ProjectService,
  type IProjectService,
} from "../modules/project/project.service";
import {
  createProjectController,
  type ProjectController,
} from "../modules/project/project.controller";

export interface Container {
  logger: ILogger;
  repositories: {
    project: IProjectRepository;
  };
  services: {
    project: IProjectService;
  };
  controllers: {
    project: ProjectController;
  };
}

export function createContainer(): Container {
  const logger = new Logger(
    { service: "val-api" },
    process.env.NODE_ENV === "production" ? "info" : "debug"
  );

  const projectRepository = new ProjectRepository(
    prisma,
    logger.child({ layer: "repository", module: "project" })
  );

  const projectService = new ProjectService(
    projectRepository,
    logger.child({ layer: "service", module: "project" })
  );

  const projectController = createProjectController(
    projectService,
    logger.child({ layer: "controller", module: "project" })
  );

  return {
    logger,
    repositories: {
      project: projectRepository,
    },
    services: {
      project: projectService,
    },
    controllers: {
      project: projectController,
    },
  };
}

let container: Container | null = null;

export function getContainer(): Container {
  if (!container) {
    container = createContainer();
  }
  return container;
}
