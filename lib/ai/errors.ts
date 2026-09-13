import 'server-only';
import OpenAI from 'openai';
import { UserError } from '@/lib/errors';

export type ProviderFailure =
  | 'billing_quota'
  | 'rate_limit'
  | 'authentication'
  | 'permission'
  | 'model_unavailable'
  | 'timeout'
  | 'network'
  | 'upstream'
  | 'configuration';

export class WordProviderError extends UserError {
  constructor(readonly category: ProviderFailure) {
    super('AI word generation is temporarily unavailable. Please try again later.');
    this.name = 'WordProviderError';
  }
}

export function classifyProviderError(error: unknown): ProviderFailure {
  if (error instanceof OpenAI.APIConnectionTimeoutError) return 'timeout';
  if (error instanceof OpenAI.APIConnectionError) return 'network';
  if (!(error instanceof OpenAI.APIError)) return 'upstream';
  // SDK APIError exposes code/type from the JSON error object. Never inspect message text.
  if (error.code === 'insufficient_quota' || error.type === 'insufficient_quota')
    return 'billing_quota';
  if (error.status === 401) return 'authentication';
  if (error.status === 403) return 'permission';
  if (error.code === 'model_not_found' || (error.status === 400 && error.param === 'model'))
    return 'model_unavailable';
  if (error.status === 429) return 'rate_limit';
  if (error.status === 400 || error.status === 422) return 'configuration';
  return 'upstream';
}

export function providerFailure(category: ProviderFailure): WordProviderError {
  // Only a fixed category is logged: no provider body, headers, keys, word or account data.
  console.error('lexiloop.ai.unavailable', { category });
  return new WordProviderError(category);
}
