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
    </div>
  )
}
