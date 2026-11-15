import { NodeHandler, NodeHandlerInput, NodeHandlerOutput } from "./types";
import { validateUrlForSsrf } from "../ssrf";
import nodemailer from "nodemailer";
import { getSMTPIntegration } from "@/lib/engine/integration-resolver";

export const handleActionHttp: NodeHandler = async ({ config, context }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const urlTemplate = String(config.url || "");
  const url = String(context.interpolate(urlTemplate));
  const method = String(config.method || "GET").toUpperCase();
  const timeoutMs = Math.min(Number(config.timeoutMs || 10000), 30000);

  // 1. SSRF Check
  const ssrfCheck = validateUrlForSsrf(url);
  if (!ssrfCheck.isSafe) {
    throw new Error(`SSRF Security Error: ${ssrfCheck.reason}`);
  }

  // 2. Prepare headers
  const headers: Record<string, string> = {
    "User-Agent": "Flowmind-Workflow-Engine/1.0",
    "Accept": "application/json, text/plain, */*",
  };

  if (config.headers && typeof config.headers === "object") {
    for (const [k, v] of Object.entries(config.headers)) {
      headers[k] = String(context.interpolate(v));
    }
  }

  // 3. Prepare body
  let body: string | undefined;
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && config.body) {
    const interpolatedBody = context.interpolate(config.body);
    body = typeof interpolatedBody === "object" ? JSON.stringify(interpolatedBody) : String(interpolatedBody);
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  // 4. Execute fetch with timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timer);

    let responseData: unknown;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      responseData = await res.json().catch(() => null);
    } else {
      responseData = await res.text().catch(() => "");
    }

    return {
      success: res.ok,
      output: {
        status: res.status,
        statusText: res.statusText,
        data: responseData,
        ok: res.ok,
      },
      error: res.ok ? undefined : `HTTP request returned status ${res.status}`,
      logs: [`HTTP ${method} to ${url} returned ${res.status}`],
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`HTTP request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
};

export const handleActionWebhook: NodeHandler = async ({ config, context }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const url = String(context.interpolate(config.url || ""));
  const payload = config.payload ? context.interpolate(config.payload) : context.toJSON();

  const ssrfCheck = validateUrlForSsrf(url);
  if (!ssrfCheck.isSafe) {
    throw new Error(`SSRF Security Error: ${ssrfCheck.reason}`);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Flowmind-Webhook-Dispatcher/1.0",
    },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });

  return {
    success: res.ok,
    output: { status: res.status, ok: res.ok },
    logs: [`Dispatched webhook to ${url} (status: ${res.status})`],
  };
};

export const handleActionEmail: NodeHandler = async ({ config, context, workspaceId }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const to = String(context.interpolate(config.to || ""));
  const subject = String(context.interpolate(config.subject || "Flowmind Notification"));
  const body = String(context.interpolate(config.body || ""));

  if (!to) {
    throw new Error("Recipient email address ('to') is required for email notification.");
  }

  const smtp = await getSMTPIntegration(workspaceId);
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  try {
    await transporter.sendMail({ from: smtp.from, to, subject, text: body });
  } catch {
    throw new Error("SMTP delivery failed. Check the configured server and credentials.");
  }

  return {
    success: true,
    output: { to, subject, sent: true, provider: "smtp" },
    logs: ["Email sent using the configured SMTP integration"],
  };
};

export const handleActionTransform: NodeHandler = async ({ config, context }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const rawExpression = String(config.expression || "");
  const output = context.interpolate(config.input || context.toJSON());

  // Safe mapping transformation without eval
  let transformed: unknown = output;
  if (config.mode === "keys" && typeof output === "object" && output !== null) {
    transformed = Object.keys(output as object);
  } else if (config.mode === "values" && typeof output === "object" && output !== null) {
    transformed = Object.values(output as object);
  } else if (rawExpression) {
    transformed = context.interpolate(rawExpression);
  }

  return {
    success: true,
    output: transformed,
    logs: ["Applied data transformation"],
  };
};

export const handleActionDatabase: NodeHandler = async ({ config, context }: NodeHandlerInput): Promise<NodeHandlerOutput> => {
  const operation = String(config.operation || "store");
  const key = String(context.interpolate(config.key || ""));
  const value = context.interpolate(config.value);

  // Store into execution context variable store
  if (key) {
    context.setVariable(key, value);
  }

  return {
    success: true,
    output: { operation, key, value, storedAt: new Date().toISOString() },
    logs: [`Database action [${operation}] executed for key: "${key}"`],
  };
};

