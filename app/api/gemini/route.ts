import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const key = process.env.GEMINI_API_KEY
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 })
  const prompt = body.mode === 'translate'
    ? `Translate the following safety guidance into ${body.language}. Preserve the meaning, urgency, warnings, and formatting. Return only the translated text.\n\n${String(body.text || '').slice(0, 12000)}`
    : `You are a calm first-aid and safety guide. Analyze this situation and return ONLY valid JSON with exactly these keys: summary (string), steps (array of 3-6 concise strings), warnings (array of 1-4 concise strings). Do not diagnose. Emphasize calling emergency services for life-threatening situations. Situation: ${String(body.description || '').slice(0, 6000)}`
  const parts: Record<string, unknown>[] = [{ text: prompt }]
  if (typeof body.image === 'string' && body.image.startsWith('data:image/')) {
    const [header, data] = body.image.split(',')
    parts.push({ inline_data: { mime_type: header.slice(5, -1), data } })
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], generationConfig: body.mode === 'translate' ? {} : { responseMimeType: 'application/json' } }) })
  if (!response.ok) return NextResponse.json({ error: 'Gemini could not process the request.' }, { status: 502 })
  const data = await response.json(); const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (body.mode === 'translate') return NextResponse.json({ translation: text })
  try { return NextResponse.json(JSON.parse(text)) } catch { return NextResponse.json({ error: 'The guidance response was not structured correctly.' }, { status: 502 }) }
}
