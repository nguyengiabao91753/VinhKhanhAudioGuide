import { useState } from 'react'
import { tourApi } from '@/entities/tour/api/tourApi'
import { ConfirmModal, toastError, toastSuccess } from '@/shared/ui'

type DeleteTourButtonProps = {
  tourId: string
  tourName: string
  onDeleted?: () => void
}

export function DeleteTourButton({
  tourId,
  tourName,
  onDeleted,
}: DeleteTourButtonProps) {
  const [loading, setLoading] = useState(false)
  const [openModal, setOpenModal] = useState(false)

  const handleDelete = async () => {
    try {
      setLoading(true)
      await tourApi.delete(tourId)
      setOpenModal(false)
      toastSuccess(`Deleted tour "${tourName}" successfully.`)
      onDeleted?.()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete tour')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        className="app-button app-button-danger"
        onClick={() => setOpenModal(true)}
        disabled={loading}
      >
        Delete
      </button>

      <ConfirmModal
        open={openModal}
        title="Delete Tour"
        message={`Are you sure you want to delete "${tourName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={loading}
        onConfirm={handleDelete}
        onCancel={() => setOpenModal(false)}
      />
    </>
  )
}