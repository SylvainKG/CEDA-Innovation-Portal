/**
 * Public facts about CEDA, the owner of the Peolwane portal, shown in the footer. Real organisation details, not
 * demo data: keep them to what CEDA publishes, and correct them here (one place) when CEDA updates its site.
 *
 * Source: CEDA's website, "Contact details" and "Help Center" pages (www.ceda.co.bw), as quoted in search results
 * on 21 Nov 2026. The site itself could not be opened from the build environment, so a team member should check
 * these against https://www.ceda.co.bw/contact-details before judging. Branch telephone numbers differ between
 * CEDA's own pages, so the footer lists branch towns only and links to CEDA's page for each office's details.
 */
export const CEDA = {
  name: 'Citizen Entrepreneurial Development Agency',
  shortName: 'CEDA',
  website: 'https://www.ceda.co.bw',
  contactPage: 'https://www.ceda.co.bw/contact-details',
  headOffice: {
    lines: ['Four Thirty Square, Plot 54350', 'PG Matante Road, CBD', 'Gaborone, Botswana'],
    postal: 'Private Bag 00504, Gaborone',
    phone: '+267 317 0895',
    tollFree: '0800 600 253',
    email: 'feedback@ceda.co.bw',
  },
  /** Towns with a CEDA branch page on www.ceda.co.bw (21 Nov 2026), head office first. */
  branches: ['Gaborone', 'Francistown', 'Selebi-Phikwe', 'Palapye', 'Maun', 'Kasane', 'Kanye', 'Molepolole', 'Ghanzi'],
} as const

/** "+267 317 0895" → "tel:+2673170895" */
export const telHref = (n: string) => `tel:${n.replace(/[^\d+]/g, '')}`
