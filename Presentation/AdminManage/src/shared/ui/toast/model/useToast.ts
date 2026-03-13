import { useSyncExternalStore } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export type ToastItem = {
  id: string
  type: ToastType
  title: string
  message: string
}

let toasts: ToastItem[] = []
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return toasts
}

function addToast(type: ToastType, title: string, message: string) {
  const id = crypto.randomUUID()
  toasts = [...toasts, { id, type, title, message }]
  emit()

  window.setTimeout(() => {
    removeToast(id)
  }, 3200)
}

function removeToast(id: string) {
  toasts = toasts.filter((toast) => toast.id !== id)
  emit()
}

export function toastSuccess(message: string, title = 'Success') {
  addToast('success', title, message)
}

export function toastError(message: string, title = 'Error') {
  addToast('error', title, message)
}

export function toastInfo(message: string, title = 'Info') {
  addToast('info', title, message)
}

export function toastWarning(message: string, title = 'Warning') {
  addToast('warning', title, message)
}

export function useToast() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    items,
    removeToast,
  }
}