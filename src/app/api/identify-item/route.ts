import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: 'Look at this image and identify the Star Wars Galoob collectible item. Return JSON with these exact fields: { "name": "item name", "serie": one of ["Action Fleet : Classic Vessel","Action Fleet : Alpha Series","Action Fleet : Transforming Playsets","Action Fleet : Sonderserie","Action Fleet : Battle Packs","Hasbro Saga Action Fleet 2002 : Vessel","Hasbro Saga Action Fleet 2002 : Battle Packs","Micro Machines : Playsets","Micro Machines : Transforming Action Sets","Micro Machines : Mini Figures","Micro Machines : Original 3 Pack Filme","Micro Machines : Original 3 Pack","Micro Machines : Mini Heads","Micro Machines : Gift Sets"] or null, "set_nummer": "set number if visible or null", "jahr": year_as_number_or_null, "zustand": "Neu in Box|Box Neuwertig|Box mit Gebrauchspuren|Box Beschädigt" }. If you cannot identify the item, return { "name": null, "serie": null, "set_nummer": null, "jahr": null, "zustand": null }.',
            },
          ],
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ name: null, serie: null, set_nummer: null, jahr: null, zustand: null })
    }

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (err) {
    console.error('identify-item error:', err)
    return NextResponse.json({ error: 'Failed to identify item' }, { status: 500 })
  }
}
