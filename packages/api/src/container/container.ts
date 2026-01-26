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
import {
  ValidationService,
  type IValidationService,
} from "../modules/validation/validation.service";

export interface Container {
  logger: ILogger;
  repositories: {
    project: IProjectRepository;
  };
  services: {
    project: IProjectService;
    validation: IValidationService;
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

  // Project module
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

  // Validation module - uses Prisma directly
  const validationService = new ValidationService(
    prisma,
    logger.child({ layer: "service", module: "validation" })
  );

  return {
    logger,
    repositories: {
      project: projectRepository,
    },
    services: {
      project: projectService,
      validation: validationService,
    },
    controllers: {
      project: projectController,
    },
  };
}

const container: Container = createContainer();

export function getContainer(): Container {
  return container;
}
