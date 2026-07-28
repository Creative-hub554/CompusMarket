import React from "react";
import { getTemplate } from "./resume/registry";
import { ResumeData, ResumeTemplateId } from "./resume/types";
import "./resume/templates";

type Props = {
  data: ResumeData;
  template?: ResumeTemplateId;
  locale?: "en" | "km";
};

export default function ResumePDF({ data, template = "single-column-blue", locale = "en" }: Props) {
  const tpl = getTemplate(template);
  if (!tpl) return null;
  return React.createElement(tpl.component, { data, config: tpl.config, locale });
}
