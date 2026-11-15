import { NodeHandler } from "./types";
import { handleManualTrigger, handleWebhookTrigger, handleScheduledTrigger } from "./triggers";
import { handleAiGenerate, handleAiClassify, handleAiSummarize, handleAiExtract } from "./ai";
import { handleLogicCondition, handleLogicSwitch, handleLogicFilter, handleLogicMerge, handleLogicLoop } from "./logic";
import { handleActionHttp, handleActionWebhook, handleActionEmail, handleActionTransform, handleActionDatabase } from "./actions";
import { handleUtilitySetVariables, handleUtilityJsonParser, handleUtilityDelay, handleUtilityFormatDate, handleUtilityTextProcess } from "./utilities";

const NODE_HANDLERS: Record<string, NodeHandler> = {
  // Triggers
  "trigger-manual": handleManualTrigger,
  "trigger-webhook": handleWebhookTrigger,
  "trigger-schedule": handleScheduledTrigger,

  // AI Nodes
  "ai-generate": handleAiGenerate,
  "ai-classify": handleAiClassify,
  "ai-summarize": handleAiSummarize,
  "ai-extract": handleAiExtract,

  // Logic Nodes
  "logic-condition": handleLogicCondition,
  "logic-switch": handleLogicSwitch,
  "logic-filter": handleLogicFilter,
  "logic-merge": handleLogicMerge,
  "logic-loop": handleLogicLoop,

  // Action Nodes
  "action-http": handleActionHttp,
  "action-webhook": handleActionWebhook,
  "action-email": handleActionEmail,
  "action-transform": handleActionTransform,
  "action-database": handleActionDatabase,

  // Utility Nodes
  "utility-variables": handleUtilitySetVariables,
  "utility-json": handleUtilityJsonParser,
  "utility-delay": handleUtilityDelay,
  "utility-date": handleUtilityFormatDate,
  "utility-text": handleUtilityTextProcess,
};

export function getNodeHandler(nodeType: string): NodeHandler | null {
  return NODE_HANDLERS[nodeType] || null;
}

export { NODE_HANDLERS };

