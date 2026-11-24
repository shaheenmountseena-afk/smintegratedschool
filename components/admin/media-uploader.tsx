'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, X, Film, Image as ImageIcon } from 'lucide-react'
import { uploadToCloudinary } from '@/lib/cloudinary-upload-client'
import { getAdminIdToken } from '@/lib/firebase/auth-client'
import type { AllowedCloudinaryFolder, CloudinaryResourceType } from '@/lib/cloudinary'

interface MediaUploaderProps {
  folder: AllowedCloudinaryFolder
  resourceType?: CloudinaryResourceType
  label?: string
  description?: string
  currentUrl?: string
  currentThumbnail?: string
  onUploadComplete: (data: { url: string; thumbnail: string; publicId: string }) => void
  onClear?: () => void
}

export function MediaUploader({
  folder,
  resourceType = 'image',
  label = 'Upload Media',
  description = 'Drag & drop or click to upload',
  currentUrl,
  currentThumbnail,
  onUploadComplete,
  onClear,
}: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(currentThumbnail || currentUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const idToken = await getAdminIdToken().catch(() => null)
      const res = await uploadToCloudinary(file, folder, resourceType, idToken || undefined)
      setPreview(res.thumbnailUrl || res.secureUrl)
      onUploadComplete({
        url: res.secureUrl,
        thumbnail: res.thumbnailUrl || res.secureUrl,
        publicId: res.publicId,
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to upload media. Please try again.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = () => {
    setPreview(null)
    setError(null)
    if (onClear) onClear()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isVideo = resourceType === 'video'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {label}
        </label>
        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1"
          >
            <X className="size-3.5" /> Remove
          </button>
        )}
      </div>

      {preview ? (
        <div className="relative group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-2 min-h-[140px] max-h-[220px]">
          {isVideo && preview.endsWith('.mp4') ? (
            <video
              src={preview}
              controls
              className="max-h-[200px] w-auto rounded-lg object-contain"
            />
          ) : (
            <div className="relative h-44 w-full">
              <Image
                src={preview}
                alt="Uploaded media preview"
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-contain rounded-lg"
              />
            </div>
          )}

          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-rose-700"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
            isUploading
              ? 'border-blue-300 bg-blue-50/50 cursor-wait'
              : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/20'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-8 text-blue-600 animate-spin" />
              <span className="text-xs font-medium text-blue-700">Uploading securely to Cloudinary...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex size-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                {isVideo ? <Film className="size-5" /> : <UploadCloud className="size-5" />}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{description}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isVideo ? 'MP4, WebM, MOV (Max 100MB)' : 'JPG, PNG, WebP (Max 10MB)'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={isVideo ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp'}
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
