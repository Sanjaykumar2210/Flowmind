import { NodeHandler, NodeHandlerInput, NodeHandlerOutput } from "./types";

export const handleManualTrigger: NodeHandler = async ({ config, context }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  // Check if context already received payload from execution request
  const executionPayload = context.getNodeOutput("trigger") || context.getNodeOutput("input");

  let payload = executionPayload;
  if (!payload && config.defaultPayload) {
    try {
      payload = typeof config.defaultPayload === "string" ? JSON.parse(config.defaultPayload) : config.defaultPayload;
    } catch {
      payload = { text: String(config.defaultPayload) };
    }
  }

  return {
    success: true,
    output: payload || { timestamp: new Date().toISOString() },
    logs: ["Manual trigger fired with payload"],
  };
};

export const handleWebhookTrigger: NodeHandler = async ({ context }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const payload = context.getNodeOutput("trigger") || context.getNodeOutput("webhook") || {};
  return {
    success: true,
    output: payload,
    logs: ["Webhook trigger fired with payload"],
  };
};

export const handleScheduledTrigger: NodeHandler = async ({ config }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const scheduledTime = new Date().toISOString();
  return {
    success: true,
    output: {
      scheduledTime,
      cronExpression: config.cronExpression || "0 * * * *",
    },
    logs: [`Scheduled cron trigger fired at ${scheduledTime}`],
  };
};

