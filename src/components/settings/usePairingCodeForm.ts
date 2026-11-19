import { useState } from 'react'
import { ApiError, verifyPairingCode } from '../../services/api/client.js'
import { classifyApiError } from '../../services/api/errors.js'
import { setPairingCode } from '../../services/settings.js'
import { useTranslate } from '../../i18n/index.js'

/** 通过本机服务验证配对码与服务配置，通过才保存 */
export const usePairingCodeForm = (onSaved?: () => void) => {
  const t = useTranslate()
  const [value, setValue] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [failure, setFailure] = useState<{ cause: unknown } | null>(null)
  const cause = failure?.cause
  const error =
    failure === null
      ? null
      : classifyApiError(cause) === 'unauthorized'
        ? t('pairingCodeInvalid')
        : classifyApiError(cause) === 'network'
          ? t('pairingCodeNetwork')
          : cause instanceof ApiError && cause.status === 422
            ? t('pairingCodeUpstreamInvalid')
            : t('pairingCodeVerificationFailed', {
              message:
                cause instanceof ApiError && cause.localMessage
                  ? t(cause.localMessage.key, cause.localMessage.params)
                  : cause instanceof Error
                    ? cause.message
                    : String(cause),
            })

  const submit = async () => {
    const pairingCode = value.trim()
    if (!pairingCode || verifying) {
      return
    }
    setVerifying(true)
    setFailure(null)
    try {
      await verifyPairingCode(pairingCode)
      setPairingCode(pairingCode)
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
