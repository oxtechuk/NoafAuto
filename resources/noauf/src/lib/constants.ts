/** Site-wide contact details (move to an API/settings endpoint later if needed). */
export const SITE = {
  phone: '+966 55 000 0000',
  phoneHref: 'tel:+966550000000',
  whatsappHref: 'https://wa.me/966550000000',
  email: 'info@zadcapital.sa',
  contactEmail: 'info@nawaf.sa',
  mapsHref: 'https://maps.google.com/?q=King+Fahd+Road+Olaya+Riyadh',
}

/** Saudi mobile: 05xxxxxxxx */
export const PHONE_RE = /^05\d{8}$/

/** Paint colors from the finance calculator frame */
export const COLORS = [
  { id: 'black', hex: '#1b1b1b' },
  { id: 'white', hex: '#f5f5f2' },
  { id: 'silver', hex: '#c5c6c2' },
  { id: 'gray', hex: '#777975' },
  { id: 'navy', hex: '#1c2d51' },
  { id: 'red', hex: '#af3032' },
  { id: 'blue', hex: '#286594' },
  { id: 'gold', hex: '#c4a64c' },
  { id: 'green', hex: '#205a39' },
  { id: 'brown', hex: '#715244' },
] as const
