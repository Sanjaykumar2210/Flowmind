import { NodeHandler, NodeHandlerInput, NodeHandlerOutput } from "./types";
import { AIClient } from "@/lib/ai/client";
import { getAIIntegration } from "@/lib/engine/integration-resolver";

export const handleAiGenerate: NodeHandler = async ({ config, context, workspaceId }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const promptTemplate = String(config.prompt || "");
  const prompt = String(context.interpolate(promptTemplate));
  const aiConfig = await getAIIntegration(workspaceId);
  const client = new AIClient(aiConfig);
  const result = await client.generate(prompt);

  return {
    success: true,
    output: { text: result },
    logs: [`Generated completion using configured ${aiConfig.provider} model`],
  };
};

export const handleAiClassify: NodeHandler = async ({ config, context, workspaceId }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const rawInput = config.inputField ? context.interpolate(config.inputField) : "";
  const text = typeof rawInput === "object" ? JSON.stringify(rawInput) : String(rawInput);

  let categories: string[] = ["General", "Urgent", "Informational"];
  if (Array.isArray(config.categories) && config.categories.length > 0) {
    categories = config.categories.map(String);
  } else if (typeof config.categories === "string") {
    categories = config.categories.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const aiConfig = await getAIIntegration(workspaceId);
  const client = new AIClient(aiConfig);
  const result = await client.classify(text, categories);

  return {
    success: true,
    output: {
      category: result.category,
      priority: result.category.toLowerCase().includes("urgent") || result.category.toLowerCase().includes("critical") ? "High" : "Medium",
      confidence: result.confidence,
      reasoning: result.reasoning,
    },
    logs: [`AI classified into category: "${result.category}" (Confidence: ${result.confidence})`],
  };
};

export const handleAiSummarize: NodeHandler = async ({ config, context, workspaceId }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const rawInput = config.inputField ? context.interpolate(config.inputField) : "";
  const text = typeof rawInput === "object" ? JSON.stringify(rawInput) : String(rawInput);
  const format = (config.format as "bullet-points" | "paragraph" | "executive-summary") || "paragraph";
  const aiConfig = await getAIIntegration(workspaceId);
  const client = new AIClient(aiConfig);
  const result = await client.summarize(text, format);

  return {
    success: true,
    output: result,
    logs: [`Summarized text using format: ${format}`],
  };
};

export const handleAiExtract: NodeHandler = async ({ config, context, workspaceId }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const rawInput = config.inputField ? context.interpolate(config.inputField) : "";
  const text = typeof rawInput === "object" ? JSON.stringify(rawInput) : String(rawInput);
  const schemaDefinition = String(config.schemaDefinition || "{\n  title: string,\n  tags: string[]\n}");
  const aiConfig = await getAIIntegration(workspaceId);
  const client = new AIClient(aiConfig);
  const result = await client.extract(text, schemaDefinition);

  return {
    success: true,
    output: result,
    logs: ["Extracted structured data according to schema"],
  };
};

