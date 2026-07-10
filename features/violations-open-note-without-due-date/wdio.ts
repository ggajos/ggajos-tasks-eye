import {
  createViolationScreenshotScenarios,
} from "../../acceptance/support/tasks-eye";
import feature from "./feature";

export const screenshotScenarios = createViolationScreenshotScenarios(feature);
