import type { Branding } from '../model/types.ts'

/** Branding used before an organisation is known, and to fill gaps in an organisation's own branding. */
export const DEFAULT_BRANDING: Required<Branding> = {
  appName: 'Voer app',
  shortName: 'Voer app',
  description: 'Voorraad en bestellingen van diervoer',
  mode: 'dark',
  primaryColor: '#03A9F4',
  secondaryColor: '#E91E63',
  themeColor: '#F61767',
  backgroundColor: '#000000',
  icon192: '/manifest-icon-192.maskable.png',
  icon512: '/manifest-icon-512.maskable.png',
  iconMaskable: '/icon.png',
}

const HEX = /^#[0-9a-fA-F]{6}$/

/** Fills missing or invalid fields from the defaults. Never trusts the stored doc blindly. */
export function resolveBranding(input: Partial<Branding> | null | undefined): Required<Branding> {
  const b = input ?? {}
  const text = (v: unknown, fallback: string, max: number) =>
    typeof v === 'string' && v.trim() !== '' ? v.trim().slice(0, max) : fallback
  const color = (v: unknown, fallback: string) => (typeof v === 'string' && HEX.test(v) ? v : fallback)
  const url = (v: unknown, fallback: string) =>
    typeof v === 'string' && (v.startsWith('/') || v.startsWith('https://')) ? v : fallback
  const d = DEFAULT_BRANDING
  return {
    appName: text(b.appName, d.appName, 60),
    shortName: text(b.shortName, text(b.appName, d.shortName, 12), 12),
    description: text(b.description, d.description, 200),
    mode: b.mode === 'light' ? 'light' : 'dark',
    primaryColor: color(b.primaryColor, d.primaryColor),
    secondaryColor: color(b.secondaryColor, d.secondaryColor),
    themeColor: color(b.themeColor, d.themeColor),
    backgroundColor: color(b.backgroundColor, d.backgroundColor),
    icon192: url(b.icon192, d.icon192),
    icon512: url(b.icon512, d.icon512),
    iconMaskable: url(b.iconMaskable, d.iconMaskable),
  }
}
