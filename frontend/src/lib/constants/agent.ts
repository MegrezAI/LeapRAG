export const AgentType = {
  ChatAgent: 'ChatAgent',
  APIAgent: 'APIAgent',
  FormAgent: 'FormAgent'
} as const;

export const AgentAbility = {
  AnswerWithRAG: 'AnswerWithRAG',
  ChatwootHandler: 'ChatwootHandler'
} as const;

export const AgentAbilityLabels: Record<AgentAbilityType, string> = {
  [AgentAbility.AnswerWithRAG]: 'RAG',
  [AgentAbility.ChatwootHandler]: 'Chatwoot'
} as const;

export type AgentAbilityType = (typeof AgentAbility)[keyof typeof AgentAbility];

export const AgentStatus = {
  Active: 'active',
  Inactive: 'inactive'
} as const;

export type AgentStatusType = (typeof AgentStatus)[keyof typeof AgentStatus];
