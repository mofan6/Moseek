import clsx from 'clsx'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { importCustomFont, restoreCustomFont } from '../../app/localFont.js'
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
  setThemePreference,
  useSettings,
  type ThemePreference,
} from '../../services/settings.js'
import { Button } from '../base/Button.js'
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
  iqoo: 'fontIqoo',
  sourceHanSans: 'fontSourceHanSans',
  sourceHanSerif: 'fontSourceHanSerif',
  inter: 'fontInter',
  system: 'fontSystem',
  custom: 'fontCustom',
} satisfies Record<InterfaceFont, TranslationKey>

const fontLicenses: Partial<Record<InterfaceFont, string>> = {
  sourceHanSans: './fonts/SourceHanSans-OFL.txt',
  sourceHanSerif: './fonts/SourceHanSerif-OFL.txt',
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
              onClick={() => setThemePreference(value)}
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

type LocalFontStatus = {
  font: 'iqoo' | 'custom'
  message: TranslationKey
  filename?: string
}

const FontSetting = () => {
  const t = useTranslate()
  const font = useSettings((state) => state.interfaceFont)
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<LocalFontStatus>()
  const [importing, setImporting] = useState(false)
  const [importFailed, setImportFailed] = useState(false)

  useEffect(() => {
    let current = true
    const report = (next: LocalFontStatus) => {
      if (current) {
        setStatus(next)
      }
    }
    if (font === 'iqoo') {
      void document.fonts.load('500 14px "Moseek iQOO"', '山川 Aa').then(
        (faces) =>
          report({ font, message: faces.length ? 'fontIqooReady' : 'fontIqooUnavailable' }),
        () => report({ font, message: 'fontIqooUnavailable' })
      )
    }
    if (font === 'custom') {
      void restoreCustomFont().then(
        (filename) =>
          report({ font, message: filename ? 'fontFileReady' : 'fontFileHelp', filename }),
        () => report({ font, message: 'fontFileUnavailable' })
      )
    }
    return () => {
      current = false
    }
  }, [font])

  const importFont = async (file: File) => {
    setImporting(true)
    setImportFailed(false)
    try {
      await importCustomFont(file)
      setStatus({ font: 'custom', message: 'fontFileReady', filename: file.name })
      setInterfaceFont('custom')
    } catch {
      setImportFailed(true)
    } finally {
      setImporting(false)
    }
  }

  const localStatus = status?.font === font ? status : undefined
  const license = fontLicenses[font]
  return (
    <div className={styles.cell}>
      <div className={styles.fontRow}>
        <span>{t('interfaceFont')}</span>
        <Select
          ariaLabel={t('interfaceFont')}
          className={styles.fontSelect}
          value={font}
          disabled={importing}
          options={INTERFACE_FONTS.map((value) => ({ value, label: t(fontLabels[value]) }))}
          onChange={(value) => {
            setImportFailed(false)
            setInterfaceFont(value)
          }}
        />
      </div>
      {font === 'custom' || font === 'iqoo' ? (
        <div className={styles.fontLocal}>
          <span className={styles.description} role="status">
            {localStatus
              ? t(localStatus.message, { filename: localStatus.filename ?? '' })
              : t(font === 'custom' ? 'fontFileHelp' : 'fontIqooHelp')}
          </span>
          <Button
            variant="outlined"
            size="s"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            {t(importing ? 'fontImporting' : 'fontImport')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            hidden
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (file) {
                void importFont(file)
              }
            }}
          />
          {importFailed ? (
            <div role="alert" className={styles.error}>
              {t('fontImportFailed')}
            </div>
          ) : null}
        </div>
      ) : null}
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
              {t('fontLicenseLink', { name: t(fontLabels[font]) })}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
