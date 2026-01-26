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
  ValidationRepository,
  type IValidationRepository,
} from "../modules/validation/validation.repository";
import {
  ValidationService,
  type IValidationService,
} from "../modules/validation/validation.service";

export interface Container {
  logger: ILogger;
  repositories: {
    project: IProjectRepository;
    validation: IValidationRepository;
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

  // Validation module
  const validationRepository = new ValidationRepository(
    prisma,
    logger.child({ layer: "repository", module: "validation" })
  );

  const validationService = new ValidationService(
    validationRepository,
    logger.child({ layer: "service", module: "validation" })
  );

  return {
    logger,
    repositories: {
      project: projectRepository,
      validation: validationRepository,
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
