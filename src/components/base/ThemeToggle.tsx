import clsx from 'clsx'
import { toggleTheme, useTheme } from '../../app/theme.js'
import { useTranslate } from '../../i18n/index.js'
import { IconDarkOutline16, IconLightOutline16 } from './icons.js'
import styles from './ThemeToggle.module.css'

export const ThemeToggle = ({ className }: { className?: string }) => {
  const t = useTranslate()
  const dark = useTheme() === 'dark'
  const label = t(dark ? 'switchToLightTheme' : 'switchToDarkTheme')
  return (
    <button
      type="button"
      className={clsx(styles.button, className)}
      aria-label={label}
      title={label}
      onClick={(event) => toggleTheme(event.currentTarget)}
    >
      <span aria-hidden="true">{dark ? <IconLightOutline16 /> : <IconDarkOutline16 />}</span>
    </button>
  )
}
