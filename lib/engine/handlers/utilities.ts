import { NodeHandler, NodeHandlerInput, NodeHandlerOutput } from "./types";

export const handleUtilitySetVariables: NodeHandler = async ({ config, context }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const variables = config.variables && typeof config.variables === "object" ? config.variables : {};
  const result: Record<string, unknown> = {};

  for (const [key, valTemplate] of Object.entries(variables)) {
    const interpolated = context.interpolate(valTemplate);
    context.setVariable(key, interpolated);
    result[key] = interpolated;
  }

  return {
    success: true,
    output: result,
    logs: [`Set ${Object.keys(result).length} variable(s) in execution context`],
  };
};

export const handleUtilityJsonParser: NodeHandler = async ({ config, context }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const rawInput = context.interpolate(config.input || "");
  const str = typeof rawInput === "object" ? JSON.stringify(rawInput) : String(rawInput);

  try {
    const parsed = JSON.parse(str);
    return {
      success: true,
      output: parsed,
      logs: ["Successfully parsed JSON payload"],
    };
  } catch (err: unknown) {
    throw new Error(`JSON parse error: ${err instanceof Error ? err.message : String(err)}`);
  }
};

export const handleUtilityDelay: NodeHandler = async ({ config }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const ms = Math.min(Number(config.delayMs || 1000), 30000);
  await new Promise<void>((resolve) => setTimeout(resolve, ms));

  return {
    success: true,
    output: { delayed: ms, delayedAt: new Date().toISOString() },
    logs: [`Delayed execution by ${ms}ms`],
  };
};

export const handleUtilityFormatDate: NodeHandler = async ({ config, context }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const rawDate = context.interpolate(config.dateField || "");
  const date = rawDate ? new Date(String(rawDate)) : new Date();
  const format = String(config.format || "iso");

  let formatted: string;
  switch (format) {
    case "locale":
      formatted = date.toLocaleString();
      break;
    case "date":
      formatted = date.toLocaleDateString();
      break;
    case "time":
      formatted = date.toLocaleTimeString();
      break;
    case "unix":
      formatted = String(Math.floor(date.getTime() / 1000));
      break;
    case "iso":
    default:
      formatted = date.toISOString();
  }

  return {
    success: true,
    output: { original: String(rawDate), formatted, format },
    logs: [`Formatted date to ${format}: ${formatted}`],
  };
};

export const handleUtilityTextProcess: NodeHandler = async ({ config, context }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const rawInput = context.interpolate(config.input || "");
  let text = typeof rawInput === "object" ? JSON.stringify(rawInput) : String(rawInput);
  const operation = String(config.operation || "trim");

  switch (operation) {
    case "uppercase":
      text = text.toUpperCase();
      break;
    case "lowercase":
      text = text.toLowerCase();
      break;
    case "trim":
      text = text.trim();
      break;
    case "split":
      return {
        success: true,
        output: text.split(String(config.delimiter || ",")),
        logs: [`Split text by "${config.delimiter || ","}"`],
      };
    case "replace":
      text = text.replaceAll(String(config.search || ""), String(config.replaceWith || ""));
      break;
    case "wordCount":
      return {
        success: true,
        output: { words: text.split(/\s+/).filter(Boolean).length, text },
        logs: ["Counted words in text"],
      };
    default:
      text = text.trim();
  }

  return {
    success: true,
    output: { result: text, operation },
    logs: [`Applied text operation: ${operation}`],
  };
};

