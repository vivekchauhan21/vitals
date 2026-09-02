'use client'

import { ChangeEvent, FormEvent, useEffect, useState } from 'react'

type Tab = 'report' | 'translate' | 'contacts'
type Contact = { id: string; name: string; value: string; kind: 'phone' | 'email' }
type Guidance = { summary: string; steps: string[]; warnings: string[] }

const languages = ['Hindi', 'Spanish', 'French', 'Tamil', 'Bengali', 'Arabic', 'Portuguese']
const starterGuidance: Guidance = {
  summary: 'Your generated guidance will appear here after you describe a situation.',
  steps: ['Describe what happened and who needs help.', 'Add a photo only if it is safe to do so.', 'Follow the returned steps while waiting for professional help.'],
  warnings: ['This companion is not a substitute for emergency services or medical care.'],
}

export default function Page() {
  const [tab, setTab] = useState<Tab>('report')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState('English')
  const [image, setImage] = useState<string | null>(null)
  const [guidance, setGuidance] = useState<Guidance | null>(null)
  const [translated, setTranslated] = useState('')
  const [translateText, setTranslateText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactName, setContactName] = useState('')
  const [contactValue, setContactValue] = useState('')
  const [contactKind, setContactKind] = useState<Contact['kind']>('phone')

  useEffect(() => {
    try { setContacts(JSON.parse(localStorage.getItem('safety-contacts') || '[]')) } catch { setContacts([]) }
  }, [])
  useEffect(() => { localStorage.setItem('safety-contacts', JSON.stringify(contacts)) }, [contacts])

  const activeText = translateText || (guidance ? [guidance.summary, ...guidance.steps, ...guidance.warnings].join('\n') : '')
  const canAlert = contacts.length > 0 && !!guidance
  const submitReport = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    if (!description.trim() && !image) { setError('Add a description or image before requesting guidance.'); return }
    setLoading(true)
    try {
      const response = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'guidance', description, image }) })
      if (!response.ok) throw new Error('The guide is unavailable right now.')
      const data = await response.json(); setGuidance(data); setTranslateText(''); setTranslated('')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Something went wrong.') } finally { setLoading(false) }
  }
  const translate = async () => {
    if (!activeText.trim()) { setError('Generate or paste guidance first.'); return }
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'translate', text: activeText, language }) })
      if (!response.ok) throw new Error('Translation is unavailable right now.')
      setTranslated((await response.json()).translation)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Something went wrong.') } finally { setLoading(false) }
  }
  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Please choose an image under 5 MB.'); return }
    const reader = new FileReader(); reader.onload = () => setImage(String(reader.result)); reader.readAsDataURL(file)
  }
  const addContact = (event: FormEvent) => {
    event.preventDefault(); if (!contactName.trim() || !contactValue.trim() || contacts.length >= 3) return
    setContacts([...contacts, { id: crypto.randomUUID(), name: contactName.trim(), value: contactValue.trim(), kind: contactKind }]); setContactName(''); setContactValue('')
  }
  const alertContact = (contact: Contact) => {
    const send = (locationText: string) => {
      const message = `Emergency: ${guidance?.summary || 'I need help.'} Please contact me. ${locationText}`
      window.location.href = contact.kind === 'phone' ? `sms:${contact.value}?body=${encodeURIComponent(message)}` : `mailto:${contact.value}?subject=Emergency%20alert&body=${encodeURIComponent(message)}`
    }
    if (!navigator.geolocation) { send('Location is unavailable in this browser.'); return }
    navigator.geolocation.getCurrentPosition(
      position => send(`My approximate location: https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`),
      () => send('Location permission was unavailable.'),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
    )
  }

  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark">HS</div><div><p className="eyebrow">HEALTH + SAFETY</p><h1>Companion</h1></div><a className="call-link" href="tel:911">Call 911</a></header>
    <section className="intro"><p className="eyebrow coral">CALM HELP, WHEN IT MATTERS</p><h2>Make the next right step.</h2><p>Describe an injury or hazard, translate critical instructions, and keep trusted contacts close.</p></section>
    <div className="notice"><strong>In an immediate emergency, call 911 first.</strong><span>This tool offers general information, not diagnosis or professional medical advice.</span></div>
    <nav className="tabs" aria-label="Safety companion sections">{([['report', 'Report Emergency'], ['translate', 'Translate Warning'], ['contacts', 'Emergency Contacts']] as const).map(([value, label]) => <button key={value} className={tab === value ? 'tab active' : 'tab'} onClick={() => { setTab(value); setError('') }} aria-current={tab === value ? 'page' : undefined}>{label}</button>)}</nav>
    {error && <p className="error" role="alert">{error}</p>}
    {tab === 'report' && <section className="workspace" aria-labelledby="report-title"><div className="panel"><p className="eyebrow">01 / REPORT</p><h3 id="report-title">What is happening?</h3><p className="muted">Share only what feels safe. A clear description helps us give more useful next steps.</p><form onSubmit={submitReport}><label htmlFor="description">Situation description</label><textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Example: I cut my palm and it is bleeding heavily..." rows={6} /><div className="input-row"><label className="upload"><input type="file" accept="image/*" capture="environment" onChange={handleImage} />Add a photo</label>{image && <div className="preview"><img src={image} alt="Uploaded situation preview" /><button type="button" onClick={() => setImage(null)}>Remove</button></div>}</div><button className="primary" disabled={loading}>{loading ? 'Preparing guidance…' : 'Get first-aid guidance'}</button></form></div><GuidanceCard guidance={guidance} /></section>}
    {tab === 'translate' && <section className="workspace single" aria-labelledby="translate-title"><div className="panel"><p className="eyebrow">02 / TRANSLATE</p><h3 id="translate-title">Make the warning understood.</h3><p className="muted">Reuse your latest guidance or paste instructions from another source.</p><label htmlFor="translate-text">Guidance to translate</label><textarea id="translate-text" value={activeText} onChange={e => setTranslateText(e.target.value)} placeholder="Paste safety instructions here…" rows={8} /><div className="control-row"><label htmlFor="language">Translate to</label><select id="language" value={language} onChange={e => setLanguage(e.target.value)}><option>English</option>{languages.map(item => <option key={item}>{item}</option>)}</select><button className="primary" onClick={translate} disabled={loading}>{loading ? 'Translating…' : 'Translate guidance'}</button></div>{translated && <div className="result"><p className="eyebrow">TRANSLATED IN {language.toUpperCase()}</p><p className="result-copy">{translated}</p><button className="secondary" onClick={() => navigator.clipboard?.writeText(translated)}>Copy translation</button></div>}</div></section>}
    {tab === 'contacts' && <section className="workspace contacts-layout" aria-labelledby="contacts-title"><div className="panel"><p className="eyebrow">03 / CONTACTS</p><h3 id="contacts-title">Keep help one tap away.</h3><p className="muted">Contacts stay in this browser only. Add up to three trusted people.</p><form onSubmit={addContact}><label htmlFor="contact-name">Name</label><input id="contact-name" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Alex Morgan" /><div className="control-row"><div><label htmlFor="contact-kind">Type</label><select id="contact-kind" value={contactKind} onChange={e => setContactKind(e.target.value as Contact['kind'])}><option value="phone">Phone / SMS</option><option value="email">Email</option></select></div><div className="grow"><label htmlFor="contact-value">Phone or email</label><input id="contact-value" value={contactValue} onChange={e => setContactValue(e.target.value)} placeholder={contactKind === 'phone' ? '+1 555 0100' : 'alex@example.com'} /></div></div><button className="primary" disabled={contacts.length >= 3}>Add emergency contact</button></form></div><div className="panel contact-list"><h3>Your trusted contacts</h3>{contacts.length === 0 ? <p className="muted">No contacts saved yet.</p> : contacts.map(contact => <article className="contact" key={contact.id}><div><strong>{contact.name}</strong><span>{contact.value}</span></div><div className="contact-actions"><button className="secondary" disabled={!canAlert} onClick={() => alertContact(contact)}>Alert</button><button className="text-button" onClick={() => setContacts(contacts.filter(item => item.id !== contact.id))}>Delete</button></div></article>)}{!guidance && contacts.length > 0 && <p className="muted small">Generate guidance in Report Emergency to enable alerts.</p>}</div></section>}
    <footer><span>Private by design · contacts never leave your browser</span><span>For emergencies: <a href="tel:911">911</a></span></footer>
  </main>
}

function GuidanceCard({ guidance }: { guidance: Guidance | null }) { const shown = guidance || starterGuidance; return <div className="panel guidance"><div className="guidance-head"><div><p className="eyebrow">GUIDANCE</p><h3>{guidance ? 'Your next steps' : 'Ready when you are'}</h3></div><span className="status">{guidance ? 'Generated' : 'Waiting'}</span></div><p className="summary">{shown.summary}</p><ol>{shown.steps.map((step, index) => <li key={index}>{step}</li>)}</ol><div className="warnings"><strong>Important warnings</strong>{shown.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</div></div> }
