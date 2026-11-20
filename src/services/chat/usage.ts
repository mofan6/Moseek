import type { MessageUsage } from '../api/types.js'
import type { AssistantMessage, Message } from './types.js'

export type TokenCounts = {
  cacheHit: number
  cacheMiss: number
  output: number
}

export const toTokenCounts = (usage: MessageUsage): TokenCounts => ({
  cacheHit: usage.cache_read_input_tokens,
  cacheMiss: usage.input_tokens + usage.cache_creation_input_tokens,
  output: usage.output_tokens,
})

export const totalTokens = ({ cacheHit, cacheMiss, output }: TokenCounts) =>
  cacheHit + cacheMiss + output

export const addTokenCounts = (previous: TokenCounts | undefined, next: TokenCounts): TokenCounts =>
  previous
    ? {
        cacheHit: previous.cacheHit + next.cacheHit,
        cacheMiss: previous.cacheMiss + next.cacheMiss,
        output: previous.output + next.output,
      }
    : next

export const getReplyTokenCounts = (reply: AssistantMessage): TokenCounts | undefined => {
  if (reply.tokenCounts) {
    return reply.tokenCounts
  }
  // 旧版也保存过起始用量，只有结束且记录了输出的旧回复能确认有最终统计。
  if (reply.status === 'done' && reply.usage && reply.usage.output_tokens > 0) {
    return toTokenCounts(reply.usage)
  }
  return undefined
}

export const getSessionTokenCounts = (messages: Message[]): TokenCounts | undefined => {
  let total: TokenCounts | undefined
  for (const message of messages) {
    const counts = message.role === 'assistant' ? getReplyTokenCounts(message) : undefined
    if (counts) {
      total = addTokenCounts(total, counts)
    }
  }
  return total
}
