import { useState } from 'react'
import { poiApi } from '@/entities/poi/api/poiApi'
import { tourApi } from '@/entities/tour/api/tourApi'
import { ConfirmModal, toastError, toastSuccess } from '@/shared/ui'

type DeletePoiButtonProps = {
  poiId: string
  poiName: string
  onDeleted?: () => void
  variant?: 'default' | 'icon'
  className?: string
}

export function DeletePoiButton({
  poiId,
  poiName,
  onDeleted,
  variant = 'default',
  className,
}: DeletePoiButtonProps) {
  const [loading, setLoading] = useState(false)
  const [openModal, setOpenModal] = useState(false)

  const handleDelete = async () => {
    try {
      setLoading(true)
      await poiApi.delete(poiId)

      // Cascade remove POI references from tours (frontend fallback)
      try {
        const toursRes = await tourApi.getAll()
        const affectedTours = toursRes.data.filter((tour) =>
          tour.poiIds.includes(poiId)
        )
        await Promise.all(
          affectedTours.map((tour) =>
            tourApi.update(tour.id, {
              ...tour,
              poiIds: tour.poiIds.filter((id) => id !== poiId),
            })
          )
        )
      } catch {
        // backend may already cascade; ignore fallback errors
      }

      setOpenModal(false)
      toastSuccess(`Đã xóa POI "${poiName}" thành công.`)
      onDeleted?.()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Không thể xóa POI')
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
        title="Xóa POI"
        message={`Bạn chắc chắn muốn xóa "${poiName}"?`}
        confirmText="Xóa"
        cancelText="Hủy"
        isLoading={loading}
        onConfirm={handleDelete}
        onCancel={() => setOpenModal(false)}
      />
    </>
  )
}
