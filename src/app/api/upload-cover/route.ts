import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import { validateImageFile } from '@/lib/validate'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

    const validationError = validateImageFile(file)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'galoob-collection/covers', resource_type: 'image' },
        (err, res) => (err ? reject(err) : resolve(res!))
      ).end(buffer)
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (err) {
    console.error('upload-cover error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
