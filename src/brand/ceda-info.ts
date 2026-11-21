/**
 * Public facts about CEDA, the owner of the Peolwane portal, shown in the footer. Real organisation details, not
 * demo data: keep them to what CEDA publishes, and correct them here (one place) when CEDA updates its site.
 *
 * Source: CEDA's official contact details, confirmed by the team lead against www.ceda.co.bw on 21 Nov 2026
 * (address, postal address, telephone, toll-free number, email, website and contact page). Branch offices are
 * not listed here: the footer links to CEDA's contact page for them instead of naming towns we haven't confirmed.
 */
export const CEDA = {
  name: 'Citizen Entrepreneurial Development Agency',
  shortName: 'CEDA',
  website: 'https://www.ceda.co.bw',
  contactPage: 'https://www.ceda.co.bw/contact-us',
  headOffice: {
    lines: ['Four Thirty Square, Plot 54350', 'PG Matante Road, CBD', 'Gaborone, Botswana'],
    postal: 'Private Bag 00504, Gaborone',
    phone: '+267 317 0895',
    tollFree: '0800 600 253',
    email: 'feedback@ceda.co.bw',
  },
} as const

/** "+267 317 0895" → "tel:+2673170895" */
export const telHref = (n: string) => `tel:${n.replace(/[^\d+]/g, '')}`
