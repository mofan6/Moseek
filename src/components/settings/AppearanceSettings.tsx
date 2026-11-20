import clsx from 'clsx'
import type { ReactNode } from 'react'
import { changeTheme } from '../../app/theme.js'
import { useTranslate, type TranslationKey } from '../../i18n/index.js'
import {
  INTERFACE_FONTS,
  PALETTES,
  type InterfaceFont,
  type Palette,
} from '../../services/appearance.js'
import {
  setInterfaceFont,
  setPalette,
  useSettings,
  type ThemePreference,
} from '../../services/settings.js'
import { Select } from '../base/Select.js'
import { IconDarkOutline16, IconFollowsystemOutline16, IconLightOutline16 } from '../base/icons.js'
import styles from './Settings.module.css'

const themeOptions: { value: ThemePreference; label: TranslationKey; icon: ReactNode }[] = [
  {
    value: 'light',
    label: 'avatarMenuSettingsDialogThemeSelectLightOption',
    icon: <IconLightOutline16 />,
  },
  {
    value: 'dark',
    label: 'avatarMenuSettingsDialogThemeSelectDarkOption',
    icon: <IconDarkOutline16 />,
  },
  {
    value: 'system',
    label: 'avatarMenuSettingsDialogThemeSelectSystemOption',
    icon: <IconFollowsystemOutline16 />,
  },
]

const paletteLabels = {
  warm: 'paletteWarm',
  ocean: 'paletteOcean',
  celadon: 'paletteCeladon',
  pine: 'palettePine',
  violet: 'paletteViolet',
  rose: 'paletteRose',
  maple: 'paletteMaple',
  graphite: 'paletteGraphite',
} satisfies Record<Palette, TranslationKey>

const fontLabels = {
  harmony: 'fontHarmony',
  harmonyRegular: 'fontHarmonyRegular',
  sourceHanSans: 'fontSourceHanSans',
  sourceHanSerif: 'fontSourceHanSerif',
  kai: 'fontKai',
  inter: 'fontInter',
  system: 'fontSystem',
} satisfies Record<InterfaceFont, TranslationKey>

const fontLicenses: Partial<Record<InterfaceFont, string>> = {
  sourceHanSans: './fonts/SourceHanSans-OFL.txt',
  sourceHanSerif: './fonts/SourceHanSerif-OFL.txt',
  kai: './fonts/LXGWWenKai-OFL.txt',
  inter: './fonts/Inter-OFL.txt',
}

export const AppearanceSettings = () => {
  const t = useTranslate()
  const theme = useSettings((state) => state.themePreference)
  const palette = useSettings((state) => state.palette)
  const themeLabel = t('avatarMenuSettingsDialogThemeItemLabel')
  const paletteLabel = t('themePalette')
  return (
    <>
      <div className={styles.theme}>
        {themeLabel}
        <div role="group" aria-label={themeLabel} className={styles.themeOptions}>
          {themeOptions.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              className={clsx(styles.themeOption, theme === value && styles.themeOptionSelected)}
              onClick={(event) => changeTheme(value, event.currentTarget)}
            >
              {icon}
              {t(label)}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.cell}>
        {paletteLabel}
        <div role="group" aria-label={paletteLabel} className={styles.paletteOptions}>
          {PALETTES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={palette === value}
              className={styles.paletteOption}
              onClick={() => setPalette(value)}
            >
              <span aria-hidden className={styles.paletteSample} data-moseek-palette={value} />
              <span>{t(paletteLabels[value])}</span>
            </button>
          ))}
        </div>
      </div>
      <FontSetting />
    </>
  )
}

const FontSetting = () => {
  const t = useTranslate()
  const font = useSettings((state) => state.interfaceFont)
  const license = fontLicenses[font]
  return (
    <div className={styles.cell}>
      <div className={styles.fontRow}>
        <span>{t('interfaceFont')}</span>
        <Select
          ariaLabel={t('interfaceFont')}
          className={styles.fontSelect}
          value={font}
          options={INTERFACE_FONTS.map((value) => ({ value, label: t(fontLabels[value]) }))}
          onChange={setInterfaceFont}
        />
      </div>
      {font !== 'system' ? (
        <div className={styles.fontCredits}>
          <a
            className={styles.fontLicense}
            href="./HARMONYOS-SANS-LICENSE.txt"
            target="_blank"
            rel="noreferrer"
          >
            {t('fontHarmonyLicense')}
          </a>
          {license ? (
            <a className={styles.fontLicense} href={license} target="_blank" rel="noreferrer">
              {t(font === 'kai' ? 'fontKaiLicense' : 'fontLicenseLink', {
                name: t(fontLabels[font]),
              })}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
