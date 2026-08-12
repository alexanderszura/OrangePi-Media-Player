import { invoke } from "@tauri-apps/api/core";

export type SystemCommandRequest = {
  command: string;
  asAdmin?: boolean;
  workingDirectory?: string;
};

export type SystemCommandResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

export function runSystemCommand(
  request: SystemCommandRequest,
): Promise<SystemCommandResult> {
  return invoke<SystemCommandResult>("run_system_command", { request });
}
