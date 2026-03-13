import { useState } from 'react'
import { tourApi } from '@/entities/tour/api/tourApi'
import { ConfirmModal, toastError, toastSuccess } from '@/shared/ui'

type DeleteTourButtonProps = {
  tourId: string
  tourName: string
  onDeleted?: () => void
  variant?: 'default' | 'icon'
  className?: string
}

export function DeleteTourButton({
  tourId,
  tourName,
  onDeleted,
  variant = 'default',
  className,
}: DeleteTourButtonProps) {
  const [loading, setLoading] = useState(false)
  const [openModal, setOpenModal] = useState(false)

  const handleDelete = async () => {
    try {
      setLoading(true)
      await tourApi.delete(tourId)
      setOpenModal(false)
      toastSuccess(`Đã xóa tour "${tourName}" thành công.`)
      onDeleted?.()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Không thể xóa tour')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        className={`${variant === 'icon' ? 'app-icon-button' : 'app-button app-button-danger'} ${className ?? ''}`}
        onClick={() => setOpenModal(true)}
        disabled={loading}
        type="button"
      >
        {variant === 'icon' ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 7h12l-1 13a2 2 0 01-2 2H9a2 2 0 01-2-2L6 7zm3-4h6l1 2H8l1-2z"
              fill="currentColor"
            />
          </svg>
        ) : (
          'Xóa'
        )}
      </button>

      <ConfirmModal
        open={openModal}
        title="Xóa Tour"
        message={`Bạn chắc chắn muốn xóa "${tourName}"?`}
        confirmText="Xóa"
        cancelText="Hủy"
        isLoading={loading}
        onConfirm={handleDelete}
        onCancel={() => setOpenModal(false)}
      />
    </>
  )
}
