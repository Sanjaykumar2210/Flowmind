export class ExecutionContext {
  private data: Record<string, unknown> = {};

  constructor(initialData?: Record<string, unknown>) {
    if (initialData) {
      this.data = { ...initialData };
    }
  }

  /**
   * Sets the output for a completed node
   */
  setNodeOutput(nodeId: string, output: unknown): void {
    this.data[nodeId] = output;
  }

  /**
   * Gets a specific node's output
   */
  getNodeOutput(nodeId: string): unknown {
    return this.data[nodeId];
  }

  /**
   * Sets global execution variables
   */
  setVariable(key: string, value: unknown): void {
    if (!this.data.variables) {
      this.data.variables = {};
    }
    (this.data.variables as Record<string, unknown>)[key] = value;
  }

  /**
   * Returns a snapshot of all context data
   */
  toJSON(): Record<string, unknown> {
    return { ...this.data };
  }

  /**
   * Interpolates template expressions in a string or object.
   * e.g. "Hello {{node-1.name}}, your ticket is {{trigger.ticketId}}"
   */
  interpolate(value: unknown): unknown {
    if (typeof value === "string") {
      return this.interpolateString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.interpolate(item));
    }

    if (value !== null && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.interpolate(v);
      }
      return result;
    }

    return value;
  }

  private interpolateString(template: string): unknown {
    // If exact single expression e.g. "{{node-1.age}}", return typed value (number/bool/obj)
    const exactMatch = template.trim().match(/^\{\{([a-zA-Z0-9_\-\.]+)\}\}$/);
    if (exactMatch) {
      const resolved = this.resolvePath(exactMatch[1]);
      return resolved !== undefined ? resolved : "";
    }

    // Otherwise replace all occurrences with string representation
    return template.replace(/\{\{([a-zA-Z0-9_\-\.]+)\}\}/g, (_, path) => {
      const resolved = this.resolvePath(path);
      if (resolved === undefined || resolved === null) return "";
      if (typeof resolved === "object") return JSON.stringify(resolved);
      return String(resolved);
    });
  }

  private resolvePath(path: string): unknown {
    const parts = path.split(".");
    let current: unknown = this.data;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== "object") {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
}

