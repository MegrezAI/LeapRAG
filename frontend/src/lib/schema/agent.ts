import { z } from 'zod';
import { dialogParamsSchema } from './dialog';
import { AgentStatus } from '../constants/agent';

export const agentBaseInfoSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().optional()
});

const agentConfigSchema = z
  .object({
    dialog_id: z.string().optional(),
    dialog_config: dialogParamsSchema.optional()
  })
  .optional();

const authenticationSchema = z
  .object({
    /**
     * List of supported authentication schemes.
     */
    schemes: z.array(z.string()).default([]),
    /**
     * Credentials for authentication. Can be a string (e.g., token) or null if not required initially.
     */
    credentials: z.string().nullable().default(null)
  })
  .nullable()
  .default(null)
  .optional();

const providerSchema = z
  .object({
    /**
     * The name of the organization providing the agent.
     */
    organization: z.string(),
    /**
     * URL associated with the agent provider.
     */
    url: z.string().nullable().default(null)
  })
  .nullable()
  .default(null)
  .optional();

const capabilitiesSchema = z
  .object({
    /**
     * Indicates if the agent supports streaming responses.
     */
    streaming: z.boolean().default(false),
    /**
     * Indicates if the agent supports push notification mechanisms.
     */
    pushNotifications: z.boolean().default(false),
    /**
     * Indicates if the agent supports providing state transition history.
     */
    stateTransitionHistory: z.boolean().default(false)
  })
  .optional();

export const skillSchema = z.object({
  /**
   * Unique identifier for the skill.
   */
  id: z.string(),
  /**
   * Human-readable name of the skill.
   */
  name: z.string(),
  /**
   * Optional description of the skill.
   */
  description: z.string().nullable().default(null),
  /**
   * Optional list of tags associated with the skill for categorization.
   */
  tags: z.array(z.string()).nullable().default(null),
  /**
   * Optional list of example inputs or use cases for the skill.
   */
  examples: z.array(z.string()).nullable().default(null),
  /**
   * Optional list of input modes supported by this skill, overriding agent defaults.
   */
  inputModes: z.array(z.string()).nullable().default(null),
  /**
   * Optional list of output modes supported by this skill, overriding agent defaults.
   */
  outputModes: z.array(z.string()).nullable().default(null)
});

export const agentCreateSchema = z.object({
  /**
   * The name of the agent.
   */
  name: z.string().min(1),
  /**
   * An optional description of the agent.
   */
  description: z.string().min(1),
  /**
   * The type of the agent.
   */
  type: z.string().default(''),
  /**
   * An optional icon for the agent.
   */
  icon: z.string().optional(),
  /**
   * The version identifier for the agent or its API.
   */
  version: z.string().default('1.0.0'),
  /**
   * The base URL endpoint for interacting with the agent.
   */
  url: z.string().optional(),
  /**
   * Agent configuration details.
   */
  agent_config: agentConfigSchema,
  /**
   * Authentication details required to interact with the agent.
   */
  authentication: authenticationSchema,
  /**
   * Information about the provider of the agent.
   */
  provider: providerSchema.optional(),
  /**
   * The documentation URL of the agent.
   */
  documentation_url: z.string().optional(),
  /**
   * The capabilities supported by the agent.
   */
  capabilities: capabilitiesSchema,
  /**
   * Default input modes supported by the agent.
   */
  defaultInputModes: z.array(z.string()).default(['text']).optional(),
  /**
   * Default output modes supported by the agent.
   */
  defaultOutputModes: z.array(z.string()).default(['text']).optional(),
  /**
   * List of specific skills offered by the agent.
   */
  skills: z.array(skillSchema).default([])
});

export const agentUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  version: z.string().optional(),
  url: z.string().optional(),
  documentation_url: z.string().optional(),
  status: z.nativeEnum(AgentStatus).optional(),
  agent_config: agentConfigSchema.optional(),
  authentication: authenticationSchema.optional(),
  provider: providerSchema.optional(),
  capabilities: capabilitiesSchema.optional(),
  defaultInputModes: z.array(z.string()).optional(),
  defaultOutputModes: z.array(z.string()).optional(),
  skills: z.array(skillSchema).optional()
});

export const sendMessageSchema = z.object({
  message: z.string().min(1),
  stream: z.boolean().default(false)
});

export type AgentCreateSchema = z.infer<typeof agentCreateSchema>;
export type AgentUpdateSchema = z.infer<typeof agentUpdateSchema>;
export type SendMessageSchema = z.infer<typeof sendMessageSchema>;
export type AgentBaseInfoSchema = z.infer<typeof agentBaseInfoSchema>;
