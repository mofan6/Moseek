import clsx from 'clsx'
import { useId, useLayoutEffect, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useAnchoredPosition, useDismiss } from './anchored.js'
import { IconCheckOutline16, IconChevronDownOutline14 } from './icons.js'
import styles from './Select.module.css'

export type SelectOption<T extends string> = { value: T; label: string; lang?: string }

/**
 * 胶囊形选择器：触发器高 36px、圆角 18px、浅灰底，下拉菜单选中项右侧打勾；
 * 点外部或 Esc 关闭。value 不匹配任何选项时触发器显示 placeholder。
 */
export const Select = <T extends string>({
  value,
  options,
  onChange,
  placeholder,
  ariaLabel,
  className,
  disabled = false,
}: {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
  ariaLabel?: string
  className?: string
  disabled?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const listId = useId()
  const selectedIndex = options.findIndex((option) => option.value === value)
  const current = options[selectedIndex]
  // 菜单贴右侧展开，最多 320px 高，超出在菜单内滚动
  const { anchorRef, floatingRef, position } = useAnchoredPosition<
    HTMLButtonElement,
    HTMLDivElement
  >(open, { align: 'end', maxHeight: 320, minSpace: 160 })
  const ready = open && position !== null && !disabled
  const closeAndFocus = () => {
    setOpen(false)
    anchorRef.current?.focus({ preventScroll: true })
  }

  // Esc 只关菜单，并把焦点还给触发器。
  useDismiss(
    open,
    [anchorRef, floatingRef],
    (reason) => {
      if (reason === 'escape') {
        closeAndFocus()
      } else {
        setOpen(false)
      }
    },
    { captureEscape: true }
  )

  useLayoutEffect(() => {
    if (ready) {
      floatingRef.current?.focus({ preventScroll: true })
    }
  }, [ready, floatingRef])

  useLayoutEffect(() => {
    const list = floatingRef.current
    const item = list?.children.item(activeIndex)
    if (!ready || !list || !item) {
      return
    }
    const listRect = list.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()
    if (itemRect.top < listRect.top) {
      list.scrollTop -= listRect.top - itemRect.top
    } else if (itemRect.bottom > listRect.bottom) {
      list.scrollTop += itemRect.bottom - listRect.bottom
    }
  }, [activeIndex, ready, floatingRef])

  const openMenu = (fallback = 0) => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : fallback)
    setOpen(true)
  }

  const select = (option: SelectOption<T>) => {
    closeAndFocus()
    onChange(option.value)
  }

  const navigateMenu = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'Tab':
        closeAndFocus()
        return
      case 'ArrowUp':
        setActiveIndex(Math.max(activeIndex - 1, 0))
        break
      case 'ArrowDown':
        setActiveIndex(Math.min(activeIndex + 1, options.length - 1))
        break
      case 'Home':
        setActiveIndex(0)
        break
      case 'End':
        setActiveIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        if (options[activeIndex]) {
          select(options[activeIndex])
        }
        break
      default:
        return
    }
    event.preventDefault()
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={clsx(styles.trigger, open && styles.open, className)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault()
            openMenu(event.key === 'ArrowUp' ? options.length - 1 : 0)
          }
        }}
      >
        {current ? (
          <span lang={current.lang}>{current.label}</span>
        ) : (
          <span className={styles.placeholder}>{placeholder}</span>
        )}
        <span className={styles.arrow}>
          <IconChevronDownOutline14 />
        </span>
      </button>
      {open && !disabled
        ? createPortal(
            <div
              ref={floatingRef}
              className={styles.menu}
              data-positioned={ready ? '' : undefined}
              style={position ?? { visibility: 'hidden' }}
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-label={ariaLabel}
              aria-activedescendant={options[activeIndex] ? `${listId}-${activeIndex}` : undefined}
              onKeyDown={navigateMenu}
            >
              {options.map((option, index) => (
                <div
                  key={option.value}
                  id={`${listId}-${index}`}
                  role="option"
                  lang={option.lang}
                  aria-selected={option.value === value}
                  data-active={activeIndex === index ? '' : undefined}
                  className={styles.option}
                  onPointerMove={(event) => {
                    if (event.pointerType === 'mouse') {
                      setActiveIndex(index)
                    }
                  }}
                  onClick={() => select(option)}
                >
                  <span>{option.label}</span>
                  {option.value === value ? <IconCheckOutline16 /> : null}
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  )
}
