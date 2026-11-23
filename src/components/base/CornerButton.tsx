import type { MouseEventHandler, ReactNode } from 'react'
import styles from './CornerButton.module.css'

export const CornerButton = ({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: MouseEventHandler<HTMLButtonElement>
}) => (
  <button type="button" className={styles.button} aria-label={label} title={label} onClick={onClick}>
    <span aria-hidden="true">{icon}</span>
  </button>
)
