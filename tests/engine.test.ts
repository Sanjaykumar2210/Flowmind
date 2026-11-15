import { describe, it, expect } from "vitest";
import { validateWorkflowGraph } from "@/lib/engine/dag";
import { ExecutionContext } from "@/lib/engine/context";
import { validateUrlForSsrf } from "@/lib/engine/ssrf";

// ---- DAG Validation Tests ----
describe("validateWorkflowGraph", () => {
  const baseTrigger = {
    id: "trig-1",
    type: "trigger-manual",
    data: { label: "Start", config: {} },
    position: { x: 0, y: 0 },
  };

  const actionNode = {
    id: "action-1",
    type: "action-http",
    data: { label: "HTTP Call", config: {} },
    position: { x: 300, y: 0 },
  };

  it("should return invalid for empty workflow", () => {
    const result = validateWorkflowGraph({ nodes: [], edges: [] });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when no trigger node exists", () => {
    const result = validateWorkflowGraph({
      nodes: [actionNode],
      edges: [],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Trigger"))).toBe(true);
  });

  it("should validate a simple linear workflow", () => {
    const result = validateWorkflowGraph({
      nodes: [baseTrigger, actionNode],
      edges: [{ id: "e1", source: "trig-1", target: "action-1" }],
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.triggerNodeId).toBe("trig-1");
  });

  it("should detect cycles", () => {
    const node2 = { id: "n2", type: "action-http", data: { label: "A", config: {} }, position: { x: 0, y: 0 } };
    const node3 = { id: "n3", type: "action-transform", data: { label: "B", config: {} }, position: { x: 0, y: 0 } };
    const result = validateWorkflowGraph({
      nodes: [baseTrigger, node2, node3],
      edges: [
        { id: "e1", source: "trig-1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n2" }, // Cycle!
      ],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("circular"))).toBe(true);
  });

  it("should compute valid topological execution order", () => {
    const condNode = { id: "cond-1", type: "logic-condition", data: { label: "Cond", config: {} }, position: { x: 0, y: 0 } };
    const result = validateWorkflowGraph({
      nodes: [baseTrigger, actionNode, condNode],
      edges: [
        { id: "e1", source: "trig-1", target: "cond-1" },
        { id: "e2", source: "cond-1", target: "action-1" },
      ],
    });
    expect(result.isValid).toBe(true);
    // Trigger should come before condition, condition before action
    const order = result.executionOrder!;
    expect(order.indexOf("trig-1")).toBeLessThan(order.indexOf("cond-1"));
    expect(order.indexOf("cond-1")).toBeLessThan(order.indexOf("action-1"));
  });

  it("should warn about orphan non-trigger nodes", () => {
    const orphan = { id: "orphan-1", type: "action-http", data: { label: "Orphan", config: {} }, position: { x: 0, y: 0 } };
    const result = validateWorkflowGraph({
      nodes: [baseTrigger, orphan],
      edges: [],
    });
    expect(result.warnings.some((w) => w.includes("Orphan"))).toBe(true);
  });
});

// ---- ExecutionContext Tests ----
describe("ExecutionContext", () => {
  it("stores and retrieves node outputs", () => {
    const ctx = new ExecutionContext();
    ctx.setNodeOutput("node-1", { result: "hello" });
    expect(ctx.getNodeOutput("node-1")).toEqual({ result: "hello" });
  });

  it("interpolates simple string templates", () => {
    const ctx = new ExecutionContext();
    ctx.setNodeOutput("trig-1", { name: "Alice", age: 30 });
    const result = ctx.interpolate("Hello {{trig-1.name}}!");
    expect(result).toBe("Hello Alice!");
  });

  it("interpolates exact expressions returning typed value", () => {
    const ctx = new ExecutionContext();
    ctx.setNodeOutput("trig-1", { count: 42 });
    const result = ctx.interpolate("{{trig-1.count}}");
    expect(result).toBe(42);
  });

  it("handles nested path resolution", () => {
    const ctx = new ExecutionContext();
    ctx.setNodeOutput("ai-1", { output: { category: "Critical" } });
    const result = ctx.interpolate("{{ai-1.output.category}}");
    expect(result).toBe("Critical");
  });

  it("returns empty string for undefined paths", () => {
    const ctx = new ExecutionContext();
    const result = ctx.interpolate("{{nonexistent.field}}");
    expect(result).toBe("");
  });

  it("sets and resolves variables", () => {
    const ctx = new ExecutionContext();
    ctx.setVariable("myVar", "testValue");
    const result = ctx.interpolate("{{variables.myVar}}");
    expect(result).toBe("testValue");
  });

  it("interpolates objects recursively", () => {
    const ctx = new ExecutionContext();
    ctx.setNodeOutput("trig-1", { email: "test@example.com" });
    const result = ctx.interpolate({ to: "{{trig-1.email}}", subject: "Hello" });
    expect(result).toEqual({ to: "test@example.com", subject: "Hello" });
  });
});

// ---- SSRF Protection Tests ----
describe("validateUrlForSsrf", () => {
  it("allows valid public HTTPS URLs", () => {
    expect(validateUrlForSsrf("https://api.example.com/data").isSafe).toBe(true);
    expect(validateUrlForSsrf("https://httpbin.org/post").isSafe).toBe(true);
    expect(validateUrlForSsrf("https://8.8.8.8/api").isSafe).toBe(true);
  });

  it("blocks localhost", () => {
    expect(validateUrlForSsrf("http://localhost:3000").isSafe).toBe(false);
    expect(validateUrlForSsrf("http://localhost/admin").isSafe).toBe(false);
  });

  it("blocks 127.x loopback IPs", () => {
    expect(validateUrlForSsrf("http://127.0.0.1:8080").isSafe).toBe(false);
    expect(validateUrlForSsrf("http://127.0.0.5").isSafe).toBe(false);
  });

  it("blocks private 10.x network", () => {
    expect(validateUrlForSsrf("http://10.0.0.1/secret").isSafe).toBe(false);
    expect(validateUrlForSsrf("http://10.255.255.255").isSafe).toBe(false);
  });

  it("blocks private 192.168.x network", () => {
    expect(validateUrlForSsrf("http://192.168.1.1").isSafe).toBe(false);
    expect(validateUrlForSsrf("http://192.168.100.50").isSafe).toBe(false);
  });

  it("blocks 172.16-31.x private range", () => {
    expect(validateUrlForSsrf("http://172.16.0.1").isSafe).toBe(false);
    expect(validateUrlForSsrf("http://172.31.255.255").isSafe).toBe(false);
  });

  it("blocks AWS/GCP metadata endpoint 169.254.169.254", () => {
    expect(validateUrlForSsrf("http://169.254.169.254/latest/meta-data/").isSafe).toBe(false);
  });

  it("blocks file:// and ftp:// protocols", () => {
    expect(validateUrlForSsrf("file:///etc/passwd").isSafe).toBe(false);
    expect(validateUrlForSsrf("ftp://files.example.com").isSafe).toBe(false);
  });

  it("blocks .local and .internal domains", () => {
    expect(validateUrlForSsrf("http://database.internal/api").isSafe).toBe(false);
    expect(validateUrlForSsrf("http://printer.local/setup").isSafe).toBe(false);
  });

  it("blocks malformed URLs", () => {
    expect(validateUrlForSsrf("not-a-url").isSafe).toBe(false);
    expect(validateUrlForSsrf("").isSafe).toBe(false);
  });
});

// ---- Logic Condition Tests ----
describe("Condition evaluation logic", () => {
  it("evaluates equals operator case-insensitively", async () => {
    const { handleLogicCondition } = await import("@/lib/engine/handlers/logic");
    const ctx = new ExecutionContext();
    ctx.setNodeOutput("ai-1", { priority: "High" });
    const result = await handleLogicCondition({
      nodeId: "cond-1",
      nodeType: "logic-condition",
      workspaceId: "workspace-1",
      config: { field: "{{ai-1.priority}}", operator: "equals", value: "high" },
      context: ctx,
    });
    expect(result.success).toBe(true);
    expect(result.selectedBranch).toBe("true");
  });

  it("evaluates contains operator", async () => {
    const { handleLogicCondition } = await import("@/lib/engine/handlers/logic");
    const ctx = new ExecutionContext();
    ctx.setNodeOutput("ai-1", { category: "Tier 1: Enterprise" });
    const result = await handleLogicCondition({
      nodeId: "cond-2",
      nodeType: "logic-condition",
      workspaceId: "workspace-1",
      config: { field: "{{ai-1.category}}", operator: "contains", value: "Enterprise" },
      context: ctx,
    });
    expect(result.selectedBranch).toBe("true");
  });

  it("evaluates notEquals operator correctly", async () => {
    const { handleLogicCondition } = await import("@/lib/engine/handlers/logic");
    const ctx = new ExecutionContext();
    const result = await handleLogicCondition({
      nodeId: "cond-3",
      nodeType: "logic-condition",
      workspaceId: "workspace-1",
      config: { field: "foo", operator: "notEquals", value: "bar" },
      context: ctx,
    });
    expect(result.selectedBranch).toBe("true");
  });

  it("resolves false branch when condition does not match", async () => {
    const { handleLogicCondition } = await import("@/lib/engine/handlers/logic");
    const ctx = new ExecutionContext();
    const result = await handleLogicCondition({
      nodeId: "cond-4",
      nodeType: "logic-condition",
      workspaceId: "workspace-1",
      config: { field: "Low", operator: "equals", value: "High" },
      context: ctx,
    });
    expect(result.selectedBranch).toBe("false");
  });
});

