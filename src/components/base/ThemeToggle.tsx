import { toggleTheme, useTheme } from '../../app/theme.js'
import { useTranslate } from '../../i18n/index.js'
import { CornerButton } from './CornerButton.js'
import { IconDarkOutline16, IconLightOutline16 } from './icons.js'

export const ThemeToggle = () => {
  const t = useTranslate()
  const dark = useTheme() === 'dark'
  const label = t(dark ? 'switchToLightTheme' : 'switchToDarkTheme')
  return (
    <CornerButton
      label={label}
      icon={dark ? <IconLightOutline16 /> : <IconDarkOutline16 />}
      onClick={(event) => toggleTheme(event.currentTarget)}
    />
  )
}
