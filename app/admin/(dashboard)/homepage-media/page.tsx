'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Film,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  FileImage,
} from 'lucide-react'
import { Modal } from '@/components/admin/modal'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { MediaUploader } from '@/components/admin/media-uploader'
import type { HomeMediaDoc } from '@/lib/firebase/firestore'
import { getAdminIdToken } from '@/lib/firebase/auth-client'

export default function HomeMediaManagementPage() {
  const [mediaList, setMediaList] = useState<HomeMediaDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'video' | 'poster'>('all')
  const [search, setSearch] = useState('')

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<HomeMediaDoc | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HomeMediaDoc | null>(null)
  const [previewItem, setPreviewItem] = useState<HomeMediaDoc | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form Fields
  const [type, setType] = useState<'poster' | 'video'>('poster')
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [url, setUrl] = useState('')
  const [thumbnail, setThumbnail] = useState('')
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState('')
  const [isPublished, setIsPublished] = useState(true)

  const authFetch = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getAdminIdToken().catch(() => null)
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return fetch(endpoint, { ...options, headers })
  }

  const fetchMedia = async () => {
    try {
      const res = await authFetch('/api/admin/home-media')
      const data = await res.json()
      if (res.ok) {
        setMediaList(data.data || [])
      }
    } catch (e) {
      console.error('Failed to load home media:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMedia()
  }, [])

  const resetForm = () => {
    setType('poster')
    setTitle('')
    setCaption('')
    setUrl('')
    setThumbnail('')
    setCloudinaryPublicId('')
    setIsPublished(true)
    setEditingItem(null)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (item: HomeMediaDoc) => {
    setEditingItem(item)
    setType(item.type)
    setTitle(item.title)
    setCaption(item.caption || '')
    setUrl(item.url)
    setThumbnail(item.thumbnail)
    setCloudinaryPublicId(item.cloudinaryPublicId || '')
    setIsPublished(item.isPublished)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) {
      alert('Title and Media URL are required.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        type,
        title: title.trim(),
        caption: caption.trim() || undefined,
        url: url.trim(),
        thumbnail: thumbnail.trim() || url.trim(),
        cloudinaryPublicId: cloudinaryPublicId.trim() || undefined,
        isPublished,
      }

      const endpoint = editingItem
        ? `/api/admin/home-media/${editingItem.id}`
        : '/api/admin/home-media'
      const method = editingItem ? 'PUT' : 'POST'

      const res = await authFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: editingItem ? 'Media item updated.' : 'Media item added successfully.',
        })
        setIsModalOpen(false)
        resetForm()
        await fetchMedia()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save media.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsSubmitting(true)
    try {
      const res = await authFetch(`/api/admin/home-media/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Media item deleted.' })
        setDeleteTarget(null)
        await fetchMedia()
      } else {
        const data = await res.json()
        setFeedback({ type: 'error', message: data.error || 'Failed to delete media.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTogglePublish = async (item: HomeMediaDoc) => {
    try {
      const res = await authFetch(`/api/admin/home-media/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !item.isPublished }),
      })
      if (res.ok) {
        setMediaList((prev) =>
          prev.map((m) => (m.id === item.id ? { ...m, isPublished: !item.isPublished } : m))
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= mediaList.length) return

    const newMedia = [...mediaList]
    const temp = newMedia[index]
    newMedia[index] = newMedia[targetIndex]
    newMedia[targetIndex] = temp

    setMediaList(newMedia)

    try {
      await authFetch('/api/admin/home-media/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newMedia.map((m) => m.id) }),
      })
    } catch (err) {
      console.error('Failed to update order on server:', err)
      await fetchMedia()
    }
  }

  const filteredMedia = mediaList.filter((m) => {
    const matchesType = filterType === 'all' || m.type === filterType
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.caption && m.caption.toLowerCase().includes(search.toLowerCase()))
    return matchesType && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-heading">
            Homepage Media
          </h2>
          <p className="text-xs text-slate-500">
            Manage promotional admission posters and campus videos displayed on the homepage.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Add Media Item</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`flex items-center justify-between gap-2.5 rounded-xl p-4 text-xs font-medium ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search media by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(['all', 'poster', 'video'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filterType === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'all' ? 'All Types' : t + 's'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Cards of Media */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="size-6 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs">Loading media records...</p>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Film className="size-8 mx-auto text-slate-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No media items found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Upload your first admission poster or video, or sync initial content from the dashboard.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMedia.map((item, idx) => (
            <div
              key={item.id}
              className="group overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col"
            >
              {/* Media Thumbnail */}
              <div
                className="relative aspect-video w-full bg-slate-100 overflow-hidden cursor-pointer"
                onClick={() => setPreviewItem(item)}
              >
                {item.thumbnail ? (
                  <Image
                    src={item.thumbnail}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-slate-100 text-slate-400">
                    <FileImage className="size-8" />
                  </div>
                )}

                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30">
                    <div className="flex size-10 items-center justify-center rounded-full bg-white/90 text-blue-600 shadow-md">
                      <Play className="size-4 ml-0.5" />
                    </div>
                  </div>
                )}

                <div className="absolute top-2 left-2">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      item.type === 'video'
                        ? 'bg-rose-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {item.type}
                  </span>
                </div>
              </div>

              {/* Information */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 line-clamp-2">
                    {item.title}
                  </h4>
                  {item.caption && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {item.caption}
                    </p>
                  )}
                </div>

                {/* Status & Reorder */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(item)}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                      item.isPublished
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.isPublished ? (
                      <>
                        <Eye className="size-3 text-emerald-600" /> Published
                      </>
                    ) : (
                      <>
                        <EyeOff className="size-3 text-slate-400" /> Hidden
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="rounded-md p-1 hover:bg-slate-100 text-slate-500 disabled:opacity-20"
                      title="Move up"
                    >
                      <ArrowUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === mediaList.length - 1}
                      className="rounded-md p-1 hover:bg-slate-100 text-slate-500 disabled:opacity-20"
                      title="Move down"
                    >
                      <ArrowDown className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="rounded-md p-1 hover:bg-slate-100 text-slate-600 hover:text-blue-600"
                      title="Edit"
                    >
                      <Edit className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="rounded-md p-1 hover:bg-rose-50 text-slate-600 hover:text-rose-600"
                      title="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Home Media' : 'Add Home Media'}
        description="Upload posters or video clips to Cloudinary. Videos can also use YouTube embed URLs."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Media Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="poster">Poster (Full-size Image)</option>
                <option value="video">Video (Walkthrough / Film)</option>
              </select>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4"
                />
                <span className="text-xs font-medium text-slate-700">Publish on Homepage</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Title / Headline *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Campus walkthrough & facilities tour"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Caption / Description (Optional)
            </label>
            <textarea
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Short description or sub-caption"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          {/* Cloudinary Uploader */}
          <MediaUploader
            folder={type === 'video' ? 'shaheen-mount-seena/home/videos' : 'shaheen-mount-seena/home/posters'}
            resourceType={type === 'video' ? 'video' : 'image'}
            label={type === 'video' ? 'Upload Video File (Cloudinary)' : 'Upload Poster Image (Cloudinary)'}
            description={type === 'video' ? 'Upload MP4/WebM video' : 'Upload high-resolution poster image'}
            currentUrl={url}
            currentThumbnail={thumbnail}
            onUploadComplete={(res) => {
              setUrl(res.url)
              setThumbnail(res.thumbnail)
              setCloudinaryPublicId(res.publicId)
            }}
            onClear={() => {
              setUrl('')
              setThumbnail('')
              setCloudinaryPublicId('')
            }}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {type === 'video' ? 'Direct Video URL or YouTube Embed URL *' : 'Media URL *'}
            </label>
            <input
              type="text"
              required
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (!thumbnail) setThumbnail(e.target.value)
              }}
              placeholder={
                type === 'video'
                  ? 'https://www.youtube-nocookie.com/embed/... or Cloudinary URL'
                  : 'Image URL (populated automatically when uploading above)'
              }
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Media'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Media Preview Modal */}
      {previewItem && (
        <Modal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title={previewItem.title}
          description={previewItem.caption || `Type: ${previewItem.type.toUpperCase()}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {previewItem.type === 'video' ? (
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                {previewItem.url.includes('youtube') ? (
                  <iframe
                    src={previewItem.url}
                    title={previewItem.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="size-full border-0"
                  />
                ) : (
                  <video src={previewItem.url} controls className="size-full" />
                )}
              </div>
            ) : (
              <div className="relative aspect-[4/5] max-h-[500px] w-full rounded-xl overflow-hidden bg-slate-100">
                <Image
                  src={previewItem.url}
                  alt={previewItem.title}
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Homepage Media"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? If hosted on Cloudinary, the file will be cleaned up automatically.`}
        confirmText="Yes, Delete"
        isLoading={isSubmitting}
      />
    </div>
  )
}
