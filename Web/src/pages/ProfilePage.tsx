import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Button, Card, Input, Label, Muted } from '../components/ui'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export function ProfilePage() {
  const { t } = useTranslation()
  const { userId } = useAuth()
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    ;(async () => {
      setError(null)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        if (error) throw error
        if (cancelled) return
        const p = (data ?? null) as Profile | null
        setProfile(p)
        setDisplayName(p?.display_name ?? '')
        setAvatarUrl(p?.avatar_url ?? '')
      } catch (e: unknown) {
        if (cancelled) return
        console.error('Load profile error:', e)
        setError(
          e instanceof Error 
            ? e.message 
            : (e as any)?.message || 'Load failed'
        )
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      setError(null)

      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(data.publicUrl)
      setSaved(false)
    } catch (e) {
      console.error('Upload error:', e)
      setError(
        e instanceof Error 
          ? e.message 
          : (e as any)?.message || 'Upload failed'
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <Link
          to="/"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          ← {t('session_detail.back')}
        </Link>
        <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          {t('profile.title')}
        </div>
        <div className="mt-1 text-sm text-zinc-500">
          {t('profile.subtitle')}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Card className="p-4">
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-sm">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-400">
                  {t('common.no_image')}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Label>{t('profile.photo_label')}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  className="h-9 border border-zinc-200"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  disabled={uploading}
                >
                  {uploading ? t('profile.uploading') : t('profile.change_photo')}
                </Button>
                {avatarUrl && (
                  <Button
                    variant="ghost"
                    className="h-9 text-zinc-500"
                    onClick={() => {
                      setAvatarUrl('')
                      setSaved(false)
                    }}
                    disabled={uploading}
                  >
                    {t('profile.remove_photo')}
                  </Button>
                )}
              </div>
              <Muted>{t('profile.photo_hint')}</Muted>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('profile.display_name_label')}</Label>
            <Input
              value={displayName}
              onChange={(e) => {
                setSaved(false)
                setDisplayName(e.target.value)
              }}
              placeholder="e.g. Mina"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('profile.avatar_url_label')}</Label>
            <Input
              value={avatarUrl}
              onChange={(e) => {
                setSaved(false)
                setAvatarUrl(e.target.value)
              }}
              placeholder="https://…"
            />
            <Muted>{t('profile.avatar_url_hint')}</Muted>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-xs text-zinc-400">
              {profile ? `User ID: ${profile.id}` : null}
            </div>
            <div className="flex items-center gap-3">
              {saved ? (
                <div className="text-sm font-medium text-emerald-600">
                  {t('profile.changes_saved')}
                </div>
              ) : null}
              <Button
                disabled={busy || uploading || !displayName.trim()}
                onClick={async () => {
                  setBusy(true)
                  setError(null)
                  try {
                    const { error } = await supabase
                      .from('profiles')
                      .update({
                        display_name: displayName.trim(),
                        avatar_url: avatarUrl.trim() ? avatarUrl.trim() : null,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', userId)
                    if (error) throw error
                    setSaved(true)
                  } catch (e) {
                    console.error('Save profile error:', e)
                    setError(
                      e instanceof Error 
                        ? e.message 
                        : (e as any)?.message || 'Save failed'
                    )
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {busy ? t('profile.saving') : t('profile.save_changes')}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

