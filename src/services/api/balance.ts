import { API_ORIGIN, ApiError, request } from './client.js'

type BalanceInfo = {
  currency: string
  total_balance: string
  granted_balance: string
  topped_up_balance: string
}

export type AccountBalance = {
  is_available: boolean
  balance_infos: BalanceInfo[]
}

const isAmount = (value: unknown): value is string =>
  typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value)

const isBalanceInfo = (value: unknown): value is BalanceInfo => {
  const item = value as Partial<Record<keyof BalanceInfo, unknown>> | null
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.currency === 'string' &&
    /^[A-Z]{3}$/.test(item.currency) &&
    isAmount(item.total_balance) &&
    isAmount(item.granted_balance) &&
    isAmount(item.topped_up_balance)
  )
}

export const getAccountBalance = async (
  apiKey: string,
  signal: AbortSignal
): Promise<AccountBalance> => {
  const response = await request(`${API_ORIGIN}/user/balance`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
    signal,
  })
  const body: Partial<AccountBalance> | null = await response.json()
  if (
    typeof body?.is_available !== 'boolean' ||
    !Array.isArray(body.balance_infos) ||
    !body.balance_infos.every(isBalanceInfo)
  ) {
    throw new ApiError('protocol', 'Invalid balance response')
  }
  return { is_available: body.is_available, balance_infos: body.balance_infos }
}
