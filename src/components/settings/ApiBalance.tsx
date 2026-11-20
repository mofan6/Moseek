import { useEffect, useId, useState } from 'react'
import { useTranslate, type TranslationKey } from '../../i18n/index.js'
import { getAccountBalance, type AccountBalance } from '../../services/api/balance.js'
import { classifyApiError } from '../../services/api/errors.js'
import { IconButton } from '../base/IconButton.js'
import { IconRefreshOutline16 } from '../base/icons.js'
import styles from './Settings.module.css'

type BalanceState =
  | { status: 'loading' }
  | { status: 'ready'; balance: AccountBalance }
  | { status: 'error'; message: TranslationKey }

export const ApiBalance = ({ apiKey }: { apiKey: string }) => {
  const t = useTranslate()
  const titleId = useId()
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<BalanceState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      controller.abort()
      setState({ status: 'error', message: 'apiBalanceFailed' })
    }, 15_000)

    void getAccountBalance(apiKey, controller.signal)
      .then((balance) => {
        if (!controller.signal.aborted) {
          setState({ status: 'ready', balance })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          const message =
            classifyApiError(error) === 'unauthorized' ? 'apiKeyInvalidRetry' : 'apiBalanceFailed'
          setState({ status: 'error', message })
        }
      })
      .finally(() => window.clearTimeout(timeout))

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [apiKey, revision])

  return (
    <section className={styles.balance} aria-labelledby={titleId}>
      <div className={styles.balanceHeader}>
        <span id={titleId} className={styles.label}>
          {t('apiBalance')}
        </span>
        <IconButton
          icon={<IconRefreshOutline16 />}
          size="xl"
          tooltip={t('apiBalanceRefresh')}
          disabled={state.status === 'loading'}
          onClick={() => {
            setState({ status: 'loading' })
            setRevision((value) => value + 1)
          }}
        />
      </div>
      <div aria-live="polite" aria-atomic="true">
        {state.status === 'loading' ? (
          <div className={styles.description}>{t('apiBalanceLoading')}</div>
        ) : state.status === 'error' ? (
          <div className={styles.error}>{t(state.message)}</div>
        ) : (
          <>
            {state.balance.balance_infos.map((info) => (
              <dl key={info.currency} className={styles.balanceAmounts}>
                <div className={styles.balanceTotal}>
                  <dt className={styles.description}>{t('apiBalanceTotal')}</dt>
                  <dd>
                    {info.total_balance} <small>{info.currency}</small>
                  </dd>
                </div>
                <div>
                  <dt className={styles.description}>{t('apiBalanceToppedUp')}</dt>
                  <dd>{info.topped_up_balance}</dd>
                </div>
                <div>
                  <dt className={styles.description}>{t('apiBalanceGranted')}</dt>
                  <dd>{info.granted_balance}</dd>
                </div>
              </dl>
            ))}
            {state.balance.balance_infos.length === 0 ? (
              <div className={styles.description}>{t('apiBalanceEmpty')}</div>
            ) : !state.balance.is_available ? (
              <div className={styles.error}>{t('insufficientBalance')}</div>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}
