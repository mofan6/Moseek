import { useState } from 'react'
import { ApiError, verifyApiKey } from '../../services/api/client.js'
import { classifyApiError } from '../../services/api/errors.js'
import { setApiKey } from '../../services/settings.js'
import { useTranslate } from '../../i18n/index.js'

/** 通过 DeepSeek 校验 API Key，通过才保存到浏览器 */
export const useApiKeyForm = (onSaved?: () => void) => {
  const t = useTranslate()
  const [value, setValue] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [failure, setFailure] = useState<{ cause: unknown } | 'storage' | null>(null)
  let error: string | null = null
  if (failure === 'storage') {
    error = t('apiKeyStorageError')
  } else if (failure) {
    const { cause } = failure
    const condition = classifyApiError(cause)
    if (condition === 'unauthorized') {
      error = t('apiKeyInvalid')
    } else if (condition === 'network') {
      error = t('commonNetworkErrorToast')
    } else {
      const message =
        cause instanceof ApiError && cause.localMessage
          ? t(cause.localMessage.key, cause.localMessage.params)
          : cause instanceof Error
            ? cause.message
            : String(cause)
      error = t('apiKeyVerificationFailed', { message })
    }
  }

  const submit = async () => {
    const apiKey = value.trim()
    if (!apiKey || verifying) {
      return
    }
    setVerifying(true)
    setFailure(null)
    try {
      await verifyApiKey(apiKey)
      if (!setApiKey(apiKey)) {
        setFailure('storage')
        return
      }
      setValue('')
      onSaved?.()
    } catch (e) {
      setFailure({ cause: e })
    } finally {
      setVerifying(false)
    }
  }

  return { value, setValue, verifying, error, submit }
}
