'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Upload, Camera, CheckCircle2, Loader2, AlertCircle, X, ImagePlus } from 'lucide-react'
import { compressImage } from '@/lib/compressImage'
import { CONDITION_PRESETS, DEFAULT_CONDITION } from '@/lib/conditionPresets'
import { SERIES_PRESETS } from '@/lib/seriesPresets'
import { getDefaultWert } from '@/lib/seriesDefaultWert'

type Step = 'upload' | 'identifying' | 'results' | 'saving'

interface EditForm {
  name: string
  serie: string
  set_nummer: string
  jahr: string
  zustand: string
  wert: string
  kaufpreis: string
}

const emptyForm: EditForm = {
  name: '', serie: '', set_nummer: '', jahr: '', zustand: DEFAULT_CONDITION, wert: '', kaufpreis: '',
}

export default function AddItemClient() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [preview, setPreview] = useState<string | null>(null)
  const [form, setForm] = useState<EditForm>(emptyForm)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverOptions, setCoverOptions] = useState<string[]>([])
  const [boxPhotoUrl, setBoxPhotoUrl] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function setField(key: keyof EditForm, value: string) {
    setForm((f) => {
      const updated = { ...f, [key]: value }
      if (key === 'serie' && !f.wert) {
        updated.wert = getDefaultWert(value) ?? ''
      }
      return updated
    })
  }

  async function processFile(rawFile: File) {
    setPreview(URL.createObjectURL(rawFile))
    setError(null)
    setStep('identifying')

    try {
      const file = await compressImage(rawFile)

      // Upload box photo to Cloudinary in parallel with identification
      const coverFormData = new FormData()
      coverFormData.append('file', file)
      const identifyFd = new FormData()
      identifyFd.append('image', file)

      const [coverRes, identifyRes] = await Promise.all([
        fetch('/api/upload-cover', { method: 'POST', body: coverFormData }),
        fetch('/api/identify-item', { method: 'POST', body: identifyFd }),
      ])

      if (coverRes.ok) {
        const { url } = await coverRes.json()
        setBoxPhotoUrl(url)
        setCoverUrl(url)
        setCoverOptions([url])
      }

      if (identifyRes.ok) {
        const data = await identifyRes.json()
        if (data.name) {
          setForm((f) => ({
            ...f,
            name: data.name ?? '',
            serie: data.serie ?? '',
            set_nummer: data.set_nummer ?? '',
            jahr: data.jahr ? String(data.jahr) : '',
            zustand: data.zustand ?? DEFAULT_CONDITION,
            wert: f.wert || getDefaultWert(data.serie) || '',
          }))
        }
      }

      setStep('results')
    } catch {
      setError('Etwas ist schiefgelaufen. Bitte Details manuell eingeben.')
      setStep('results')
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) processFile(file)
  }

  async function handleCoverUpload(rawFile: File) {
    setUploadingCover(true)
    try {
      const file = await compressImage(rawFile)
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload-cover', { method: 'POST', body: formData })
      if (res.ok) {
        const { url } = await res.json()
        setCoverUrl(url)
        setCoverOptions((prev) => [url, ...prev])
      }
    } finally {
      setUploadingCover(false)
    }
  }

  async function saveItem() {
    if (!form.name.trim()) return
    setStep('saving')

    const payload = {
      name: form.name.trim(),
      serie: form.serie.trim() || null,
      set_nummer: form.set_nummer.trim() || null,
      jahr: form.jahr ? parseInt(form.jahr) : null,
      zustand: form.zustand.trim() || null,
      wert: form.wert.trim() || null,
      kaufpreis: form.kaufpreis.trim() || null,
      lieferung_ausstehend: 0,
      cover_url: coverUrl,
      user_photos: boxPhotoUrl ? [boxPhotoUrl] : null,
    }

    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const item = await res.json()
      router.push(`/items/${item.id}`)
    } else {
      setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
      setStep('results')
    }
  }

  function reset() {
    setStep('upload'); setPreview(null); setForm(emptyForm)
    setError(null); setCoverUrl(null); setCoverOptions([]); setBoxPhotoUrl(null)
  }

  const dropZoneProps = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) },
    onDragLeave: () => setIsDragging(false),
    onDrop: handleDrop,
  }

  const inputClass = "w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all"
  const labelClass = "block text-xs font-medium text-zinc-400 mb-1.5"

  if (step === 'upload') {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-1">Artikel zur Sammlung hinzufügen</h2>
          <p className="text-zinc-400">Mach ein Foto des Artikels und Claude identifiziert ihn automatisch.</p>
        </div>
        <div
          {...dropZoneProps}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            isDragging ? 'border-yellow-500 bg-yellow-500/10' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'
          }`}
        >
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Camera className="w-8 h-8 text-yellow-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Foto aufnehmen oder Bild hochladen</p>
              <p className="text-zinc-500 text-sm mt-1">Unterstützt JPEG, PNG, WebP</p>
            </div>
            <div className="flex gap-3 mt-2">
              <span
                onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click() }}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" /> Foto aufnehmen
              </span>
              <span
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" /> Datei hochladen
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'identifying') {
    return (
      <div className="space-y-8">
        <div className="flex gap-6 items-start">
          {preview && (
            <div className="relative w-24 aspect-[3/4] rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 ring-1 ring-white/10">
              <Image src={preview} alt="Hochgeladenes Foto" fill className="object-cover" />
            </div>
          )}
          <div className="flex-1 space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
              <span className="text-white font-medium">Artikel wird identifiziert…</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 rounded-full animate-pulse w-2/3" />
              </div>
              <p className="text-zinc-500 text-sm">Claude liest das Foto und identifiziert den Artikel…</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'results' || step === 'saving') {
    return (
      <div className="space-y-8">

        {/* Preview + reset */}
        {preview && (
          <div className="flex gap-4 items-start">
            <div className="relative w-20 aspect-[3/4] rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 ring-1 ring-white/10">
              <Image src={preview} alt="Hochgeladenes Foto" fill className="object-cover" />
              <button onClick={reset} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 pt-2">
              <p className="text-sm text-zinc-400">Foto wurde hochgeladen. Details unten prüfen und anpassen.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* Cover image picker */}
        <div className="space-y-3 border-t border-white/5 pt-6">
          <p className="text-sm font-medium text-zinc-300">Cover-Bild <span className="text-zinc-500 font-normal">— wird in der Sammlung angezeigt</span></p>

          <div className="flex gap-4 items-start">
            <div className="relative w-24 aspect-[3/4] rounded-xl overflow-hidden bg-zinc-800 ring-2 ring-yellow-500 flex-shrink-0">
              {coverUrl ? (
                <Image src={coverUrl} alt="Cover" fill className="object-cover" sizes="96px" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-1 text-zinc-600">
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-xs">Kein Cover</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              {coverOptions.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {coverOptions.map((url) => (
                    <button
                      key={url}
                      onClick={() => setCoverUrl(url)}
                      className={`relative w-14 aspect-[3/4] rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                        coverUrl === url ? 'ring-2 ring-yellow-500' : 'ring-1 ring-white/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <Image src={url} alt="Cover Option" fill className="object-cover" sizes="56px" />
                    </button>
                  ))}
                </div>
              )}
              <input ref={coverInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f) }} className="hidden" />
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
              >
                {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Eigenes Cover hochladen
              </button>
            </div>
          </div>
        </div>

        {/* Editable form */}
        <div className="space-y-4 border-t border-white/5 pt-6">
          <p className="text-sm font-medium text-zinc-300">Artikel-Details <span className="text-zinc-500 font-normal">— alles bearbeitbar</span></p>

          <div>
            <label className={labelClass}>Name *</label>
            <input type="text" placeholder="Artikelname" value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Serie</label>
              <select value={form.serie} onChange={(e) => setField('serie', e.target.value)} className={inputClass}>
                <option value="">— wählen —</option>
                {SERIES_PRESETS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Set-Nummer</label>
              <input type="text" placeholder="z.B. #7" value={form.set_nummer} onChange={(e) => setField('set_nummer', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Jahr</label>
              <input type="number" placeholder="z.B. 1994" value={form.jahr} onChange={(e) => setField('jahr', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Zustand</label>
              <select value={form.zustand} onChange={(e) => setField('zustand', e.target.value)} className={inputClass}>
                <option value="">— wählen —</option>
                {CONDITION_PRESETS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Kaufpreis <span className="text-zinc-600">(€)</span></label>
              <input type="text" placeholder="z.B. 30,00" value={form.kaufpreis} onChange={(e) => setField('kaufpreis', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Wert <span className="text-zinc-600">(€)</span></label>
              <input type="text" placeholder="z.B. 45,00" value={form.wert} onChange={(e) => setField('wert', e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={reset} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-4 py-3 rounded-xl transition-colors">
            Neu starten
          </button>
          <button
            onClick={saveItem}
            disabled={!form.name.trim() || step === 'saving'}
            className="flex-[2] flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            {step === 'saving' ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</> : <><CheckCircle2 className="w-4 h-4" /> Zur Sammlung hinzufügen</>}
          </button>
        </div>
      </div>
    )
  }

  return null
}
