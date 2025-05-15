import { type DialogParamsSchema } from '@/lib/schema/dialog';

/**
 * Represents an agent in the system.
 */
export interface Agent {
  /**
   * Unique identifier for the agent.
   */
  id: string;

  /**
   * The name of the agent.
   */
  name: string;

  /**
   * Optional description of the agent.
   * @default null
   */
  description?: string;

  /**
   * The type of agent (ChatAgent, APIAgent, FormAgent).
   */
  type: 'ChatAgent' | 'APIAgent' | 'FormAgent';

  /**
   * The tenant ID associated with this agent.
   */
  tenant_id: string;

  /**
   * Optional icon for the agent (emoji).
   * @default "🤖"
   */
  icon?: string;

  /**
   * The current status of the agent.
   */
  status: 'active' | 'inactive';

  /**
   * The version identifier for the agent or its API.
   * @default "1.0.0"
   */
  version: string;

  /**
   * The base URL endpoint for interacting with the agent.
   */
  url?: string;

  /**
   * The local URL endpoint for interacting with the agent.
   */
  local_url?: string;

  /**
   * Configuration specific to the agent type.
   */
  agent_config: {
    dialog_id?: string;
    dialog_config?: DialogParamsSchema;
    [key: string]: any;
  };

  /**
   * Authentication details required to interact with the agent.
   */
  authentication: AgentAuthentication | null;

  /**
   * Information about the provider of the agent.
   */
  provider: AgentProvider | null;

  /**
   * The capabilities supported by the agent.
   */
  capabilities: AgentCapabilities;

  /**
   * List of specific skills offered by the agent.
   */
  skills: AgentSkill[];

  /**
   * Optional URL pointing to the agent's documentation.
   */
  documentation_url?: string;

  /**
   * Default input modes supported by the agent (e.g., 'text', 'file', 'json').
   * @default ["text"]
   */
  defaultInputModes?: string[];

  /**
   * Default output modes supported by the agent (e.g., 'text', 'file', 'json').
   * @default ["text"]
   */
  defaultOutputModes?: string[];

  /**
   * The timestamp when this agent was created.
   */
  created_at: string;

  /**
   * The timestamp when this agent was last updated.
   */
  updated_at: string;
}

/**
 * Defines the authentication schemes and credentials for an agent.
 */
export interface AgentAuthentication {
  /**
   * List of supported authentication schemes.
   */
  schemes: string[];

  /**
   * Credentials for authentication. Can be a string (e.g., token) or null if not required initially.
   * @default null
   */
  credentials?: string | null;
}

/**
 * Describes the capabilities of an agent.
 */
export interface AgentCapabilities {
  /**
   * Indicates if the agent supports streaming responses.
   * @default false
   */
  streaming?: boolean;

  /**
   * Indicates if the agent supports push notification mechanisms.
   * @default false
   */
  pushNotifications?: boolean;

  /**
   * Indicates if the agent supports providing state transition history.
   * @default false
   */
  stateTransitionHistory?: boolean;
}

/**
 * Represents the provider or organization behind an agent.
 */
export interface AgentProvider {
  /**
   * The name of the organization providing the agent.
   */
  organization: string;

  /**
   * URL associated with the agent provider.
   * @default null
   */
  url?: string | null;
}

/**
 * Defines a specific skill or capability offered by an agent.
 */
export interface AgentSkill {
  /**
   * Unique identifier for the skill.
   */
  id: string;

  /**
   * Human-readable name of the skill.
   */
  name: string;

  /**
   * Optional description of the skill.
   * @default null
   */
  description?: string | null;

  /**
   * Optional list of tags associated with the skill for categorization.
   * @default null
   */
  tags?: string[] | null;

  /**
   * Optional list of example inputs or use cases for the skill.
   * @default null
   */
  examples?: string[] | null;

  /**
   * Optional list of input modes supported by this skill, overriding agent defaults.
   * @default null
   */
  inputModes?: string[] | null;

  /**
   * Optional list of output modes supported by this skill, overriding agent defaults.
   * @default null
   */
  outputModes?: string[] | null;
}
