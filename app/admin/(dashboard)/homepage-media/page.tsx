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
  Camera,
  Sparkles,
  ExternalLink,
  ArrowRight,
} from 'lucide-react'
import { Modal } from '@/components/admin/modal'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { MediaUploader } from '@/components/admin/media-uploader'
import type { HomeMediaDoc } from '@/lib/firebase/firestore'
import { getAdminIdToken } from '@/lib/firebase/auth-client'
import {
  getDefaultVideoThumbnail,
  getVideoEmbedUrl,
  isDirectVideoUrl,
  optimizeCloudinaryUrl,
} from '@/lib/media-utils'

type MediaTypeOption = 'poster' | 'video' | 'photo'

const TYPE_META: Record<
  MediaTypeOption,
  { label: string; badgeClass: string; icon: React.ElementType }
> = {
  poster: {
    label: 'Poster',
    badgeClass: 'bg-blue-600 text-white',
    icon: Sparkles,
  },
  video: {
    label: 'Video',
    badgeClass: 'bg-rose-600 text-white',
    icon: Film,
  },
  photo: {
    label: 'Photo',
    badgeClass: 'bg-emerald-600 text-white',
    icon: Camera,
  },
}

const CTA_PRESETS = [
  { label: 'Enquiry', text: 'Enquire Now', link: '/enquiry' },
  { label: 'Programmes', text: 'Explore Programmes', link: '/coaching-programmes' },
  { label: 'Results', text: 'View Results', link: '/results' },
  { label: 'Gallery', text: 'View Gallery', link: '/gallery' },
  { label: 'Contact', text: 'Contact Us', link: '/contact' },
]

export default function HomeMediaManagementPage() {
  const [mediaList, setMediaList] = useState<HomeMediaDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | MediaTypeOption>('all')
  const [search, setSearch] = useState('')

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<HomeMediaDoc | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HomeMediaDoc | null>(null)
  const [previewItem, setPreviewItem] = useState<HomeMediaDoc | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form Fields
  const [type, setType] = useState<MediaTypeOption>('poster')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [thumbnail, setThumbnail] = useState('')
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState('')
  const [thumbnailPublicId, setThumbnailPublicId] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [ctaLink, setCtaLink] = useState('')
  const [displayOrder, setDisplayOrder] = useState<number>(0)
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

  const resetForm = (nextOrder = mediaList.length) => {
    setType('poster')
    setTitle('')
    setDescription('')
    setUrl('')
    setThumbnail('')
    setCloudinaryPublicId('')
    setThumbnailPublicId('')
    setCtaText('')
    setCtaLink('')
    setDisplayOrder(nextOrder)
    setIsPublished(true)
    setEditingItem(null)
  }

  const openCreateModal = () => {
    resetForm(mediaList.length)
    setIsModalOpen(true)
  }

  const openEditModal = (item: HomeMediaDoc) => {
    setEditingItem(item)
    setType((item.type as MediaTypeOption) || 'poster')
    setTitle(item.title)
    setDescription(item.description || item.caption || '')
    setUrl(item.url || item.mediaUrl || '')
    setThumbnail(item.thumbnail || item.thumbnailUrl || '')
    setCloudinaryPublicId(item.cloudinaryPublicId || '')
    setThumbnailPublicId(item.thumbnailPublicId || '')
    setCtaText(item.ctaText || '')
    setCtaLink(item.ctaLink || '')
    setDisplayOrder(item.order ?? item.displayOrder ?? 0)
    setIsPublished(item.isPublished)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) {
      setFeedback({ type: 'error', message: 'Title and Media URL are required.' })
      return
    }

    if (Boolean(ctaText.trim()) !== Boolean(ctaLink.trim())) {
      setFeedback({
        type: 'error',
        message: 'Please provide both CTA Button Text and CTA Destination Link (or leave both blank).',
      })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)
    try {
      const cleanUrl = url.trim()
      const cleanThumb =
        thumbnail.trim() ||
        (type === 'video' ? getDefaultVideoThumbnail(cleanUrl) || cleanUrl : cleanUrl)

      const payload = {
        type,
        mediaType: type === 'video' ? 'video' : 'image',
        title: title.trim(),
        description: description.trim(),
        caption: description.trim(),
        url: cleanUrl,
        thumbnail: cleanThumb,
        cloudinaryPublicId: cloudinaryPublicId.trim(),
        thumbnailPublicId: thumbnailPublicId.trim(),
        ctaText: ctaText.trim(),
        ctaLink: ctaLink.trim(),
        order: Math.max(0, Math.floor(Number(displayOrder) || 0)),
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
          message: editingItem ? 'Media slide updated.' : 'Media slide added successfully.',
        })
        setIsModalOpen(false)
        resetForm()
        await fetchMedia()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save media slide.' })
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
    setFeedback(null)
    try {
      const res = await authFetch(`/api/admin/home-media/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: data.message || 'Media slide and Cloudinary asset deleted successfully.',
        })
        setDeleteTarget(null)
        await fetchMedia()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to delete media slide.' })
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

  const handleMoveById = async (itemId: string, direction: 'up' | 'down') => {
    const index = mediaList.findIndex((m) => m.id === itemId)
    if (index === -1) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= mediaList.length) return

    const newMedia = [...mediaList]
    const temp = newMedia[index]
    newMedia[index] = newMedia[targetIndex]
    newMedia[targetIndex] = temp

    const reindexed = newMedia.map((m, i) => ({ ...m, order: i, displayOrder: i }))
    setMediaList(reindexed)

    try {
      const res = await authFetch('/api/admin/home-media/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reindexed.map((m) => m.id) }),
      })
      if (!res.ok) {
        await fetchMedia()
      }
    } catch (err) {
      console.error('Failed to update order on server:', err)
      await fetchMedia()
    }
  }

  const isFiltering = filterType !== 'all' || search.trim().length > 0

  const filteredMedia = mediaList.filter((m) => {
    const matchesType = filterType === 'all' || m.type === filterType
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      m.title.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q)) ||
      (m.caption && m.caption.toLowerCase().includes(q)) ||
      (m.ctaText && m.ctaText.toLowerCase().includes(q))
    return matchesType && matchesSearch
  })

  const livePreviewThumb =
    thumbnail.trim() ||
    (type === 'video' ? getDefaultVideoThumbnail(url.trim()) : url.trim())

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-heading">
            Campus Film &amp; Media Carousel
          </h2>
          <p className="text-xs text-slate-500">
            Manage promotional posters, campus films, and campus photographs in the homepage advertisement slider.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Add Carousel Slide</span>
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
            placeholder="Search slides by title, caption or CTA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          {(['all', 'poster', 'video', 'photo'] as const).map((t) => (
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
              {t === 'all' ? 'All Slides' : `${t}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Cards of Media */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="size-6 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs">Loading carousel slides...</p>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Film className="size-8 mx-auto text-slate-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No carousel slides found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Upload an image poster, promotional video, or campus photograph to display on the homepage.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMedia.map((item) => {
            const globalIndex = mediaList.findIndex((m) => m.id === item.id)
            const meta = TYPE_META[(item.type as MediaTypeOption) || 'poster'] || TYPE_META.poster
            const cardThumb = item.thumbnail || item.thumbnailUrl || item.url
            const optimizedCardThumb = cardThumb
              ? optimizeCloudinaryUrl(cardThumb, { resourceType: 'image', width: 640 })
              : ''
            const desc = item.description || item.caption

            return (
              <div
                key={item.id}
                className="group overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col"
              >
                {/* Media Thumbnail */}
                <div
                  className="relative aspect-video w-full bg-slate-900 overflow-hidden cursor-pointer"
                  onClick={() => setPreviewItem(item)}
                >
                  {optimizedCardThumb ? (
                    <Image
                      src={optimizedCardThumb}
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
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35">
                      <div className="flex size-10 items-center justify-center rounded-full bg-white/95 text-blue-600 shadow-md">
                        <Play className="size-4 ml-0.5 fill-current" />
                      </div>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}
                    >
                      {meta.label}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      #{globalIndex + 1}
                    </span>
                  </div>
                </div>

                {/* Information */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 line-clamp-2">
                      {item.title}
                    </h4>
                    {desc && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {desc}
                      </p>
                    )}
                    {item.ctaText && item.ctaLink && (
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                        <span>CTA: {item.ctaText}</span>
                        <span className="text-slate-400">({item.ctaLink})</span>
                      </div>
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
                        onClick={() => handleMoveById(item.id, 'up')}
                        disabled={isFiltering || globalIndex === 0}
                        className="rounded-md p-1 hover:bg-slate-100 text-slate-500 disabled:opacity-20"
                        title={isFiltering ? 'Clear filters to reorder' : 'Move earlier'}
                      >
                        <ArrowUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveById(item.id, 'down')}
                        disabled={isFiltering || globalIndex === mediaList.length - 1}
                        className="rounded-md p-1 hover:bg-slate-100 text-slate-500 disabled:opacity-20"
                        title={isFiltering ? 'Clear filters to reorder' : 'Move later'}
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
            )
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Carousel Slide' : 'Add Carousel Slide'}
        description="Upload posters, campus photographs, or promotional videos to Cloudinary and configure slide overlay details."
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Media Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MediaTypeOption)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="poster">Image Poster (Admission / Event Poster)</option>
                <option value="photo">Campus &amp; Event Photograph</option>
                <option value="video">Promotional Video (Campus Film / Reel)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Display Order
              </label>
              <input
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Slide Headline / Title *
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Integrated NEET/JEE Residential Batch"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4"
                />
                <span className="text-xs font-medium text-slate-700">
                  Publish slide on homepage
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description / Subtitle (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short promotional copy shown over the bottom of the slide"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          {/* Primary Cloudinary Uploader */}
          <MediaUploader
            folder={type === 'video' ? 'shaheen-mount-seena/home/videos' : 'shaheen-mount-seena/home/posters'}
            resourceType={type === 'video' ? 'video' : 'image'}
            label={
              type === 'video'
                ? 'Upload Promotional Video (Cloudinary)'
                : type === 'photo'
                  ? 'Upload Campus Photograph (Cloudinary)'
                  : 'Upload Poster Image (Cloudinary)'
            }
            description={
              type === 'video'
                ? 'Upload MP4, WebM or MOV video'
                : 'Upload JPG, PNG or WebP image (landscape or portrait supported)'
            }
            currentUrl={url}
            currentThumbnail={thumbnail}
            onUploadComplete={(res) => {
              setUrl(res.url)
              if (type !== 'video' || !thumbnail) {
                setThumbnail(res.thumbnail)
              }
              setCloudinaryPublicId(res.publicId)
            }}
            onClear={() => {
              setUrl('')
              if (type !== 'video') setThumbnail('')
              setCloudinaryPublicId('')
            }}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {type === 'video' ? 'Direct Video URL or YouTube Embed URL *' : 'Media Image URL *'}
            </label>
            <input
              type="text"
              required
              value={url}
              onChange={(e) => {
                const nextUrl = e.target.value
                setUrl(nextUrl)
                if (type !== 'video' && !thumbnail) {
                  setThumbnail(nextUrl)
                }
              }}
              placeholder={
                type === 'video'
                  ? 'https://res.cloudinary.com/... or https://www.youtube.com/watch?v=...'
                  : 'Populated automatically after upload above'
              }
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          {/* Optional Custom Video Poster Thumbnail */}
          {type === 'video' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <MediaUploader
                folder="shaheen-mount-seena/home/posters"
                resourceType="image"
                label="Custom Video Poster / Thumbnail Image (Optional)"
                description="Upload a custom cover image, or leave blank to auto-generate from the video"
                currentUrl={thumbnail}
                currentThumbnail={thumbnail}
                onUploadComplete={(res) => {
                  setThumbnail(res.url)
                  setThumbnailPublicId(res.publicId)
                }}
                onClear={() => {
                  setThumbnail('')
                  setThumbnailPublicId('')
                }}
              />
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Video Thumbnail URL (Optional)
                </label>
                <input
                  type="text"
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="Auto-generated from Cloudinary/YouTube if left blank"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Optional CTA Configuration */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Optional CTA Button
              </span>
              <div className="flex flex-wrap gap-1.5">
                {CTA_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setCtaText(preset.text)
                      setCtaLink(preset.link)
                    }}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  CTA Button Text
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="e.g. Apply Now"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  CTA Destination Link
                </label>
                <input
                  type="text"
                  value={ctaLink}
                  onChange={(e) => setCtaLink(e.target.value)}
                  placeholder="e.g. /enquiry or https://..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Live Slide Preview Card */}
          {(livePreviewThumb || title) && (
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Live Homepage Slide Preview
              </span>
              <div className="relative h-52 w-full overflow-hidden rounded-2xl bg-[#0b1f4b] border border-slate-200">
                {livePreviewThumb && (
                  <Image
                    src={optimizeCloudinaryUrl(livePreviewThumb, { resourceType: 'image', width: 900 })}
                    alt="Slide preview"
                    fill
                    className="object-contain opacity-95"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1f4b]/95 via-[#0b1f4b]/45 to-transparent" />
                {type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center pb-8">
                    <div className="flex size-12 items-center justify-center rounded-full bg-white/95 text-[#d71920] shadow-lg">
                      <Play className="ml-0.5 size-5 fill-current" />
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {title || 'Slide headline preview'}
                    </p>
                    {description && (
                      <p className="text-xs text-white/80 line-clamp-1 mt-0.5">{description}</p>
                    )}
                  </div>
                  {ctaText && ctaLink && (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#d71920] px-3 py-1.5 text-[11px] font-medium text-white">
                      {ctaText}
                      <ArrowRight className="size-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

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
              {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Publish Slide'}
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
          description={
            previewItem.description || previewItem.caption || `Type: ${previewItem.type.toUpperCase()}`
          }
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {previewItem.type === 'video' ? (
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                {isDirectVideoUrl(previewItem.url) ? (
                  <video
                    src={optimizeCloudinaryUrl(previewItem.url, { resourceType: 'video' })}
                    poster={
                      previewItem.thumbnail
                        ? optimizeCloudinaryUrl(previewItem.thumbnail, { resourceType: 'image', width: 1200 })
                        : undefined
                    }
                    controls
                    className="size-full"
                  />
                ) : (
                  <iframe
                    src={getVideoEmbedUrl(previewItem.url)}
                    title={previewItem.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="size-full border-0"
                  />
                )}
              </div>
            ) : (
              <div className="relative aspect-[16/10] max-h-[500px] w-full rounded-xl overflow-hidden bg-slate-900">
                <Image
                  src={optimizeCloudinaryUrl(previewItem.url, { resourceType: 'image', width: 1600 })}
                  alt={previewItem.title}
                  fill
                  className="object-contain"
                />
              </div>
            )}

            {previewItem.ctaText && previewItem.ctaLink && (
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-xs">
                <span className="font-medium text-slate-700">
                  CTA Button: <strong>{previewItem.ctaText}</strong>
                </span>
                <span className="inline-flex items-center gap-1 text-blue-600">
                  {previewItem.ctaLink} <ExternalLink className="size-3" />
                </span>
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
        title="Delete Carousel Slide"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? Any uploaded Cloudinary image or video asset will be deleted securely before removing this slide.`}
        confirmText="Yes, Delete"
        isLoading={isSubmitting}
      />
    </div>
  )
}
