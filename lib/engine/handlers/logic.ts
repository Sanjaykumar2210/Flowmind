import { NodeHandler, NodeHandlerInput, NodeHandlerOutput } from "./types";

export const handleLogicCondition: NodeHandler = async ({ config, context }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const leftValue = config.field ? context.interpolate(config.field) : undefined;
  const operator = String(config.operator || "equals");
  const rightValue = config.value !== undefined ? context.interpolate(config.value) : undefined;

  let isTrue = false;

  const leftStr = leftValue === undefined || leftValue === null ? "" : String(leftValue);
  const rightStr = rightValue === undefined || rightValue === null ? "" : String(rightValue);

  switch (operator) {
    case "equals":
    case "==":
      isTrue = leftStr.toLowerCase() === rightStr.toLowerCase();
      break;
    case "notEquals":
    case "!=":
      isTrue = leftStr.toLowerCase() !== rightStr.toLowerCase();
      break;
    case "contains":
      isTrue = leftStr.toLowerCase().includes(rightStr.toLowerCase());
      break;
    case "notContains":
      isTrue = !leftStr.toLowerCase().includes(rightStr.toLowerCase());
      break;
    case "greaterThan":
    case ">":
      isTrue = Number(leftValue) > Number(rightValue);
      break;
    case "lessThan":
    case "<":
      isTrue = Number(leftValue) < Number(rightValue);
      break;
    case "startsWith":
      isTrue = leftStr.toLowerCase().startsWith(rightStr.toLowerCase());
      break;
    case "endsWith":
      isTrue = leftStr.toLowerCase().endsWith(rightStr.toLowerCase());
      break;
    case "isEmpty":
      isTrue = leftValue === undefined || leftValue === null || leftStr.trim() === "" || (Array.isArray(leftValue) && leftValue.length === 0);
      break;
    case "isNotEmpty":
      isTrue = leftValue !== undefined && leftValue !== null && leftStr.trim() !== "" && (!Array.isArray(leftValue) || leftValue.length > 0);
      break;
    case "regex":
      try {
        const regex = new RegExp(rightStr, "i");
        isTrue = regex.test(leftStr);
      } catch {
        isTrue = false;
      }
      break;
    default:
      isTrue = Boolean(leftValue);
  }

  const selectedBranch = isTrue ? "true" : "false";

  return {
    success: true,
    output: {
      result: isTrue,
      evaluatedBranch: selectedBranch,
      leftValue,
      operator,
      rightValue,
    },
    selectedBranch,
    logs: [`Evaluated condition [${leftStr} ${operator} ${rightStr}] => ${isTrue} (Branch: ${selectedBranch})`],
  };
};

export const handleLogicSwitch: NodeHandler = async ({ config, context }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const switchVal = String(context.interpolate(config.field || ""));
  const cases = Array.isArray(config.cases) ? config.cases : [];

  let matchedCase = "default";
  for (const c of cases) {
    if (String(c).toLowerCase() === switchVal.toLowerCase()) {
      matchedCase = String(c);
      break;
    }
  }

  return {
    success: true,
    output: { value: switchVal, matchedCase },
    selectedBranch: matchedCase,
    logs: [`Switch evaluated "${switchVal}" => branch "${matchedCase}"`],
  };
};

export const handleLogicFilter: NodeHandler = async ({ config, context }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const items = context.interpolate(config.arrayField);
  if (!Array.isArray(items)) {
    return {
      success: true,
      output: [],
      logs: ["Input is not an array, returned empty list"],
    };
  }

  const targetKey = String(config.itemKey || "");
  const matchValue = String(config.matchValue || "");

  const filtered = items.filter((item) => {
    if (typeof item === "object" && item !== null && targetKey) {
      const val = (item as Record<string, unknown>)[targetKey];
      return String(val).toLowerCase() === matchValue.toLowerCase();
    }
    return String(item).toLowerCase() === matchValue.toLowerCase();
  });

  return {
    success: true,
    output: filtered,
    logs: [`Filtered array from ${items.length} items to ${filtered.length} items`],
  };
};

export const handleLogicMerge: NodeHandler = async ({ context }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const allOutputs = context.toJSON();
  return {
    success: true,
    output: allOutputs,
    logs: ["Merged upstream context outputs"],
  };
};

export const handleLogicLoop: NodeHandler = async ({ config, context }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const items = context.interpolate(config.arrayField);
  const maxIterations = Math.min(Number(config.maxIterations || 50), 100);

  if (!Array.isArray(items)) {
    return {
      success: true,
      output: { iterations: 0, items: [] },
      logs: ["Target for loop is not an iterable array"],
    };
  }

  const sliced = items.slice(0, maxIterations);
  return {
    success: true,
    output: {
      total: items.length,
      processed: sliced.length,
      items: sliced,
    },
    logs: [`Prepared loop for ${sliced.length} items (safe cap: ${maxIterations})`],
  };
};

