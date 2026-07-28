import { ResumeTemplate } from "./types";

const templates = new Map<string, ResumeTemplate>();

export function registerTemplate(template: ResumeTemplate) {
  templates.set(template.id, template);
}

export function getTemplate(id: string): ResumeTemplate | undefined {
  return templates.get(id);
}

export function getAllTemplates(): ResumeTemplate[] {
  return Array.from(templates.values());
}
