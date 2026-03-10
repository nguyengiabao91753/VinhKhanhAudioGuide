import { useState } from 'react'
import { poiApi } from '@/entities/poi/api/poiApi'
import { ConfirmModal, toastError, toastSuccess } from '@/shared/ui'

type DeletePoiButtonProps = {
  poiId: string
  poiName: string
  onDeleted?: () => void
}

export function DeletePoiButton({
  poiId,
  poiName,
  onDeleted,
}: DeletePoiButtonProps) {
  const [loading, setLoading] = useState(false)
  const [openModal, setOpenModal] = useState(false)

  const handleDelete = async () => {
    try {
      setLoading(true)
      await poiApi.delete(poiId)
      setOpenModal(false)
      toastSuccess(`Deleted POI "${poiName}" successfully.`)
      onDeleted?.()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete POI')
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
        title="Delete POI"
        message={`Are you sure you want to delete "${poiName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={loading}
        onConfirm={handleDelete}
        onCancel={() => setOpenModal(false)}
      />
    </>
  )
}