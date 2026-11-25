import { useTranslate } from '../../i18n/index.js'
import { CornerButton } from '../base/CornerButton.js'
import { IconSettingsOutline16 } from '../base/icons.js'
import { ThemeToggle } from '../base/ThemeToggle.js'
import { openSettings } from './settingsDialogState.js'

export const SettingsShortcuts = () => {
  const t = useTranslate()
  return (
    <>
      <ThemeToggle />
      <CornerButton
        icon={<IconSettingsOutline16 />}
        label={t('settings')}
        onClick={() => openSettings('general')}
      />
    </>
  )
}
