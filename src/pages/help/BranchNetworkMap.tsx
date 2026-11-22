import { useEffect, useMemo, useRef, useState } from 'react'
import { Building2, ExternalLink, MapPin, Navigation } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CEDA } from '@/brand/ceda-info'

type Branch = {
  id: string
  name: string
  region: string
  lat: number
  lng: number
  approximate?: boolean
  officialPage?: string
}

const BRANCHES: Branch[] = [
  { id: 'gaborone', name: 'Gaborone', region: 'Gaborone region', lat: -24.6504, lng: 25.9085, officialPage: 'ceda-hq' },
  { id: 'hukuntsi', name: 'Hukuntsi', region: 'South', lat: -23.993, lng: 21.7735, officialPage: 'hukuntsi-branch' },
  { id: 'kanye', name: 'Kanye', region: 'South', lat: -25.0097, lng: 25.3699, officialPage: 'kanye-branch' },
  { id: 'molepolole', name: 'Molepolole', region: 'South', lat: -24.4021, lng: 25.5298, officialPage: 'molepolole-branch' },
  { id: 'tsabong', name: 'Tsabong', region: 'South', lat: -26.021746, lng: 22.401006, approximate: true },
  { id: 'francistown', name: 'Francistown', region: 'North', lat: -21.1636, lng: 27.5096, officialPage: 'francistown-branch' },
  { id: 'letlhakane', name: 'Letlhakane', region: 'North', lat: -21.4027, lng: 25.5794, officialPage: 'letlhakane-branch' },
  { id: 'palapye', name: 'Palapye', region: 'North', lat: -22.5557, lng: 27.1333, officialPage: 'palapye-branch' },
  { id: 'selebi-phikwe', name: 'Selebi-Phikwe', region: 'North', lat: -21.9881, lng: 27.8134, officialPage: 'selebi-phikwe-branch' },
  { id: 'tutume', name: 'Tutume', region: 'North', lat: -20.488492, lng: 27.036817, approximate: true },
  { id: 'ghanzi', name: 'Ghanzi', region: 'North-West', lat: -21.7025, lng: 21.6498, officialPage: 'ghanzi-branch' },
  { id: 'kasane', name: 'Kasane', region: 'North-West', lat: -17.8094, lng: 25.1659, officialPage: 'kasane-branch' },
  { id: 'maun', name: 'Maun', region: 'North-West', lat: -19.9943, lng: 23.4161, officialPage: 'maun-branch' },
  { id: 'shakawe', name: 'Shakawe', region: 'North-West', lat: -18.37, lng: 21.84, officialPage: 'shakawe-branch' },
]

const REGIONS = ['All branches', 'Gaborone region', 'South', 'North', 'North-West'] as const

const PHOTO_STORIES = [
  {
    place: 'Gaborone · Head office',
    title: 'CEDA headquarters',
    image: 'https://guardiansun.co.bw/cbet/uploads/images/2023/11/16/92641.jpg',
    alt: 'Exterior of CEDA headquarters in Gaborone',
    source: 'Guardian Sun',
    href: 'https://guardiansun.co.bw/ampArticle/2101',
  },
  {
    place: 'Tutume · North',
    title: 'A new local branch',
    image: 'https://dailynews.gov.bw/common_up/dailynews/11-12-2025_new-ceda-branch-to-spur-local-growth-_1765450316_image_main_89366.jpeg',
    alt: 'New CEDA branch entrance in Tutume',
    source: 'DailyNews',
    href: 'https://dailynews.gov.bw/news-detail/89366',
  },
  {
    place: 'Shakawe · North-West',
    title: 'Branch opening in Shakawe',
    image: 'https://dailynews.gov.bw/common_up/dailynews/11-09-2022_11-09-2022_---waste-management-viable-business---_1662899499_image_main_69086.jpg_image_main.jpg',
    alt: 'Opening ceremony for the CEDA Shakawe branch',
    source: 'DailyNews',
    href: 'https://dailynews.gov.bw/news-detail/69086',
  },
]

function markerIcon(selected: boolean) {
  return L.divIcon({
    className: 'ceda-map-pin-shell',
    html: `<span class="ceda-map-pin${selected ? ' ceda-map-pin--selected' : ''}" aria-hidden="true"><span></span></span>`,
    iconSize: [32, 42],
    iconAnchor: [16, 38],
    tooltipAnchor: [0, -34],
  })
}

export function BranchNetworkMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef(new Map<string, L.Marker>())
  const [region, setRegion] = useState<(typeof REGIONS)[number]>('All branches')
  const [selectedId, setSelectedId] = useState('gaborone')

  const visibleBranches = useMemo(
    () => region === 'All branches' ? BRANCHES : BRANCHES.filter((branch) => branch.region === region),
    [region],
  )
  const selected = BRANCHES.find((branch) => branch.id === selectedId) ?? BRANCHES[0]!
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const markers = markersRef.current

    const map = L.map(containerRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      keyboard: true,
      attributionControl: true,
    }).setView([-22.3, 24.3], 5)
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map)
    L.control.zoom({ position: 'topright' }).addTo(map)

    for (const branch of BRANCHES) {
      const marker = L.marker([branch.lat, branch.lng], {
        icon: markerIcon(branch.id === 'gaborone'),
        title: `${branch.name} CEDA branch${branch.approximate ? ' (approximate town location)' : ''}`,
        alt: `${branch.name} branch location`,
        keyboard: true,
      }).addTo(map)
      marker.bindTooltip(branch.name, { direction: 'top', offset: [0, -3] })
      marker.on('click', () => setSelectedId(branch.id))
      markers.set(branch.id, marker)
    }

    const resize = () => map.invalidateSize({ pan: false })
    const resizeTimer = window.setTimeout(resize, 100)
    window.addEventListener('resize', resize)

    return () => {
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', resize)
      markers.clear()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const visibleIds = new Set(visibleBranches.map((branch) => branch.id))
    for (const branch of BRANCHES) {
      const marker = markersRef.current.get(branch.id)
      if (!marker) continue
      if (map && visibleIds.has(branch.id)) marker.addTo(map)
      else marker.remove()
    }
    if (map && visibleBranches.length === 1) {
      map.setView([visibleBranches[0]!.lat, visibleBranches[0]!.lng], 8, { animate: false })
    } else if (map && visibleBranches.length > 1) {
      const bounds = L.latLngBounds(visibleBranches.map(({ lat, lng }) => [lat, lng] as [number, number]))
      map.fitBounds(bounds.pad(0.24), { maxZoom: 7, animate: false })
    }
  }, [region, visibleBranches])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    for (const branch of BRANCHES) markersRef.current.get(branch.id)?.setIcon(markerIcon(branch.id === selectedId))
    const marker = markersRef.current.get(selectedId)
    if (marker && visibleBranches.some((branch) => branch.id === selectedId)) map.panTo(marker.getLatLng(), { animate: true, duration: 0.35 })
  }, [selectedId, visibleBranches])

  function selectRegion(nextRegion: (typeof REGIONS)[number]) {
    setRegion(nextRegion)
    if (nextRegion !== 'All branches' && !BRANCHES.some((branch) => branch.id === selectedId && branch.region === nextRegion)) {
      setSelectedId(BRANCHES.find((branch) => branch.region === nextRegion)!.id)
    }
  }

  return (
    <div className="flex flex-col gap-12 md:gap-14">
      <section aria-labelledby="branch-network-heading" className="relative overflow-hidden rounded-[2rem] border border-line bg-surface-card shadow-1">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-amber),var(--ceda-orange),var(--ceda-maroon))]" />
        <div className="flex flex-col gap-5 p-5 pt-7 md:p-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <span aria-hidden className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--ceda-maroon)] text-white sm:flex">
                <MapPin className="h-6 w-6" />
              </span>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-bold uppercase tracking-wider text-brand-text">Find support near you</p>
                <h2 id="branch-network-heading" className="text-[1.75rem] font-normal leading-tight md:text-[2rem]">CEDA branches across Botswana</h2>
                <p className="max-w-2xl text-ink-muted">{BRANCHES.length} branches in four regions. Choose a region, or select a pin or a town, to see a branch and get directions.</p>
              </div>
            </div>
            <a href={CEDA.branchNetworkPage} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-touch items-center gap-2 self-start font-semibold text-brand-text underline-offset-4 hover:underline lg:shrink-0">
              CEDA’s official branch page <ExternalLink aria-hidden className="h-4 w-4" /><span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>

          <div aria-label="Filter branches by region" className="flex flex-wrap gap-2">
            {REGIONS.map((option) => (
              <button key={option} type="button" aria-pressed={region === option} onClick={() => selectRegion(option)} className={`min-h-touch rounded-full border px-4 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${region === option ? 'border-[var(--ceda-maroon)] bg-[var(--ceda-maroon)] text-white' : 'border-line bg-white text-ink hover:bg-surface-sunken'}`}>
                {option}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(17rem,0.8fr)]">
            <div ref={containerRef} role="region" aria-label="Interactive map of CEDA branches in Botswana" className="ceda-branch-map z-0 min-h-[22rem] overflow-hidden rounded-md border border-line bg-surface-sunken sm:min-h-[27rem]" />
            <aside aria-live="polite" aria-atomic="true" className="flex flex-col gap-4 rounded-md border border-line bg-[linear-gradient(160deg,var(--ceda-sky-start),var(--ceda-band-start))] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ceda-maroon)]">
                <Building2 aria-hidden className="h-4 w-4" /> Selected branch
              </div>
              <div className="flex flex-col items-start gap-2">
                <h3 className="text-[1.75rem] font-normal leading-tight">{selected.name}</h3>
                <p className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[var(--ceda-brown)] shadow-1">{selected.region} · Botswana</p>
              </div>
              {selected.approximate ? (
                <p className="rounded-md border border-line bg-white/80 p-3 text-sm text-ink-muted">This is an approximate town-centre pin. Confirm the branch address with CEDA before travelling.</p>
              ) : (
                <p className="rounded-md border border-line bg-white/80 p-3 text-sm text-ink-muted">Use the official CEDA branch page to confirm the current address and opening hours.</p>
              )}
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-touch items-center justify-center gap-2 rounded-full bg-brand px-4 font-semibold text-brand-on no-underline hover:bg-brand-hover">
                <Navigation aria-hidden className="h-4 w-4" /> Get directions <ExternalLink aria-hidden className="h-4 w-4" /><span className="sr-only"> (opens in a new tab)</span>
              </a>
              {selected.officialPage ? (
                <a href={`https://www.ceda.co.bw/${selected.officialPage}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-touch items-center gap-2 font-semibold text-brand-text underline-offset-4 hover:underline">
                  Branch information <ExternalLink aria-hidden className="h-4 w-4" /><span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
            </aside>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
              <MapPin aria-hidden className="h-4 w-4 text-[var(--ceda-maroon)]" />
              <span>Choose a branch</span>
              <span className="font-normal">({visibleBranches.length})</span>
            </div>
            <ul aria-label="Branches in the selected region" className="flex flex-wrap gap-2">
              {visibleBranches.map((branch) => (
                <li key={branch.id}>
                  <button type="button" aria-pressed={selectedId === branch.id} onClick={() => setSelectedId(branch.id)} className={`min-h-touch rounded-full border px-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${selectedId === branch.id ? 'border-[var(--ceda-maroon)] bg-[var(--ceda-band-start)] text-[var(--ceda-maroon)]' : 'border-line bg-white text-ink hover:bg-surface-sunken'}`}>
                    {branch.name}{branch.approximate ? <span className="sr-only"> (approximate pin)</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-ink-muted">Map tiles © OpenStreetMap contributors. Most pins follow CEDA’s published branch map; Tutume and Tsabong use approximate town-centre coordinates.</p>
        </div>
      </section>

      <section aria-labelledby="branch-stories-heading" className="flex flex-col gap-5">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="text-sm font-bold uppercase tracking-wider text-brand-text">Across the network</p>
          <h2 id="branch-stories-heading" className="text-[1.75rem] font-normal leading-tight md:text-[2rem]">A look at CEDA’s offices</h2>
          <p className="text-ink-muted">A few published snapshots of CEDA locations and branch milestones. Each photo opens its original story.</p>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:h-[30rem] lg:grid-cols-3 lg:grid-rows-2">
          {PHOTO_STORIES.map((story, i) => (
            <li
              key={story.title}
              className={`group relative isolate overflow-hidden rounded-[1.25rem] bg-[var(--ceda-night)] shadow-1 ${i === 0 ? 'aspect-[4/3] md:col-span-2 lg:col-span-2 lg:row-span-2 lg:aspect-auto' : 'aspect-[4/3] lg:aspect-auto'}`}
            >
              <img
                src={story.image}
                alt={story.alt}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="absolute inset-0 -z-10 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.04]"
              />
              <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(43,29,25,0.15)_0%,transparent_35%,rgba(43,29,25,0.9)_100%)]" />
              <a
                href={story.href}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex flex-col justify-between p-4 text-white no-underline focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white md:p-5"
              >
                <span className="self-start rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-[var(--ceda-maroon)]">{story.place}</span>
                <span className="flex flex-col gap-1">
                  <h3 className={i === 0 ? 'text-[1.5rem] font-semibold leading-tight md:text-[1.75rem]' : 'text-h2 font-semibold'}>{story.title}</h3>
                  <span className="inline-flex min-h-touch items-center gap-2 text-sm font-semibold text-white/90 group-hover:underline">
                    Photo and story: {story.source} <ExternalLink aria-hidden className="h-4 w-4" /><span className="sr-only"> (opens in a new tab)</span>
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-muted">Published photography by <a className="font-semibold underline" href="https://guardiansun.co.bw/ampArticle/2101" target="_blank" rel="noopener noreferrer">Guardian Sun</a> and <a className="font-semibold underline" href="https://dailynews.gov.bw/news-detail/89366" target="_blank" rel="noopener noreferrer">DailyNews</a>.</p>
      </section>
    </div>
  )
}
