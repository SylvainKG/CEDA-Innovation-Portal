/**
 * Public facts about CEDA, the owner of the Peolwane portal, shown in the footer. Real organisation details, not
 * demo data: keep them to what CEDA publishes, and correct them here (one place) when CEDA updates its site.
 *
 * Source: CEDA's official website. Head-office details were confirmed on 21 Nov 2026; branch names and regional
 * groupings come from CEDA's current branch network and complaints pages (22 Nov 2026). Check official pages for
 * current addresses, phone numbers and opening hours.
 */
export const CEDA = {
  name: 'Citizen Entrepreneurial Development Agency',
  shortName: 'CEDA',
  website: 'https://www.ceda.co.bw',
  contactPage: 'https://www.ceda.co.bw/contact-us',
  branchNetworkPage: 'https://www.ceda.co.bw/branch-network',
  branchRegions: [
    { name: 'Gaborone region', branches: ['Gaborone'] },
    { name: 'South', branches: ['Hukuntsi', 'Kanye', 'Molepolole', 'Tsabong'] },
    { name: 'North', branches: ['Francistown', 'Letlhakane', 'Palapye', 'Selebi-Phikwe', 'Tutume'] },
    { name: 'North-West', branches: ['Ghanzi', 'Kasane', 'Maun', 'Shakawe'] },
  ],
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
