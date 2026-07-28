import { registerTemplate } from "../registry";
import { ResumeData } from "../types";
import { ResumeRenderer } from "./renderer";
import { templateConfigs } from "./configs";

export type { ResumeData };

templateConfigs.forEach((config) => {
  registerTemplate({
    id: config.id,
    name: config.name,
    nameKm: config.nameKm,
    config,
    component: ResumeRenderer,
  });
});
