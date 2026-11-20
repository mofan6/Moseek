import { useTranslate } from '../../i18n/index.js'
import { useSettings } from '../../services/settings.js'
import { totalTokens, type TokenCounts } from '../../services/chat/usage.js'
import styles from './TokenUsage.module.css'

export const TokenUsage = ({
  counts,
  label,
  detail,
}: {
  counts: TokenCounts
  label: string
  detail?: string
}) => {
  const t = useTranslate()
  const locale = useSettings((state) => state.locale)
  const format = new Intl.NumberFormat(locale)
  const metrics = [
    [t('totalTokenCount'), totalTokens(counts)],
    [t('cachedTokenCount'), counts.cacheHit],
    [t('uncachedTokenCount'), counts.cacheMiss],
    [t('outputTokenCount'), counts.output],
  ] as const
  const breakdown = [
    [t('thinkingTokenCount'), counts.thinking, false],
    [t('safetyTokenCount'), counts.safety, false],
    [t('searchRequestCount'), counts.searches, true],
    [t('fetchRequestCount'), counts.fetches, true],
  ] as const
  return (
    <div className={styles.usage} role="group" aria-label={label}>
      <span className={styles.label}>{label}</span>
      {detail ? <span>{detail}</span> : null}
      <dl className={styles.metrics}>
        {metrics.map(([name, count]) => (
          <div className={styles.metric} key={name}>
            <dt>{name}</dt>
            <dd>{format.format(count)}</dd>
          </div>
        ))}
      </dl>
      {breakdown.some(([, count]) => count !== undefined) ? (
        <details className={styles.breakdown}>
          <summary>{t('replyUsageBreakdown')}</summary>
          <dl className={styles.metrics}>
            {breakdown.map(([name, count, times]) =>
              count === undefined ? null : (
                <div className={styles.metric} key={name}>
                  <dt>{name}</dt>
                  <dd>
                    {times
                      ? t('usageRequestTimes', { count: format.format(count) })
                      : format.format(count)}
                  </dd>
                </div>
              )
            )}
          </dl>
        </details>
      ) : null}
    </div>
  )
}
