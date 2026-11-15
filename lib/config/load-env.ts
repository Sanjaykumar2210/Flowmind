import { loadEnvConfig } from "@next/env";

export function loadEnvironment(): void {
  loadEnvConfig(process.cwd());
}