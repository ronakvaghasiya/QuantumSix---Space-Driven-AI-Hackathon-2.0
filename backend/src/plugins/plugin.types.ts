export enum PluginType {
  VALIDATOR = 'validator',
  AI_PROVIDER = 'ai_provider',
  INTEGRATION = 'integration',
  WORKFLOW_NODE = 'workflow_node',
}

export enum PluginHook {
  POST_ANALYSIS = 'post_analysis',
  POST_CODE_GENERATION = 'post_code_generation',
  POST_VALIDATION = 'post_validation',
  PRE_PR = 'pre_pr',
}

export interface PluginManifest {
  version: string;
  hooks: PluginHook[];
  description?: string;
  author?: string;
}

export interface PluginHookContext {
  organizationId: string;
  taskId: string;
  projectId?: string;
  payload?: Record<string, unknown>;
}

export interface PluginHookResult {
  pluginSlug: string;
  hook: PluginHook;
  status: 'ok' | 'warn' | 'fail';
  message: string;
  data?: Record<string, unknown>;
}

export interface PluginHandler {
  slug: string;
  execute(hook: PluginHook, context: PluginHookContext): Promise<PluginHookResult>;
}
