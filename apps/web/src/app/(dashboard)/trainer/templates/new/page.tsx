import { Metadata } from "next";
import { TemplateBuilder } from "@/components/trainer/template-builder";

export const metadata: Metadata = { title: "New Template" };

export default function NewTemplatePage() {
  return <TemplateBuilder />;
}
