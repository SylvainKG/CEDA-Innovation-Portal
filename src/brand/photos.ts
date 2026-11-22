import biustStemFestival from '@/assets/photos/biust-stem-festival.webp'
import dressmaker from '@/assets/photos/dressmaker.webp'
import farmerKalakamati from '@/assets/photos/farmer-kalakamati.webp'
import gaboroneCbd from '@/assets/photos/gaborone-cbd.webp'
import mainMall from '@/assets/photos/main-mall.webp'
import okavangoSunrise from '@/assets/photos/okavango-sunrise.webp'
import swallow from '@/assets/photos/swallow.webp'

/**
 * Photographs of Botswana on the public pages (post-freeze, ABM 22 Nov 2026). Every one is a real photo from
 * Wikimedia Commons under an open licence (public domain, CC0, CC BY or CC BY-SA), credited on the About page
 * (#photo-credits) as the licences require. They were resized and converted to WebP; nothing else was changed,
 * except that the dressmaker photo is cropped to her and her machine. To add one: download it from Commons, record
 * it here with its author, licence and source page, and keep the alt text to what the photo shows.
 */
export interface Photo {
  src: string
  /** Intrinsic size of the file, so the browser reserves space before it loads. */
  width: number
  height: number
  /** What the photo shows, for screen readers. */
  alt: string
  /** A short label shown on the photo (sector or place). */
  caption: string
  credit: { author: string; licence: string; licenceUrl?: string; source: string }
}

export const PHOTOS = {
  sunrise: {
    src: okavangoSunrise,
    width: 1400,
    height: 936,
    alt: 'The sun rising behind a lone tree in the Okavango Delta, Botswana, under a sky turning from deep blue to orange',
    caption: 'Sunrise · Okavango Delta',
    credit: {
      author: 'Diego Delso',
      licence: 'CC BY-SA 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      source: 'https://commons.wikimedia.org/wiki/File:Salida_de_sol,_delta_del_Okavango,_Botsuana,_2018-08-01,_DD_21.jpg',
    },
  },
  gaboroneCbd: {
    src: gaboroneCbd,
    width: 1600,
    height: 900,
    alt: "Aerial view of Gaborone's new Central Business District, with the city stretching out to the hills",
    caption: 'Gaborone, new CBD',
    credit: { author: 'Jota @ BRAZIL', licence: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:Gaborone,_Botswana_New_Development_CBD.jpg' },
  },
  techStand: {
    src: biustStemFestival,
    width: 1600,
    height: 900,
    alt: 'Visitors at the Computer Science and Information Systems stand, with a drone and a Raspberry Pi display, at the BIUST STEM Festival in Palapye',
    caption: 'Technology · BIUST, Palapye',
    credit: {
      author: 'Astronomy & Society Group (Universe Awareness)',
      licence: 'CC BY 2.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
      source: 'https://commons.wikimedia.org/wiki/File:BIUST_Botswana_2.jpg',
    },
  },
  farmer: {
    src: farmerKalakamati,
    width: 1200,
    height: 800,
    alt: 'A young Motswana farmer with his hand on his bull at his farm in Kalakamati',
    caption: 'Agriculture · Kalakamati',
    credit: {
      author: 'Mompati Dikunwane',
      licence: 'CC BY-SA 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      source: 'https://commons.wikimedia.org/wiki/File:A_young_Motswana_Farmer_brushing_a_bull_at_his_farm_1.jpg',
    },
  },
  dressmaker: {
    src: dressmaker,
    width: 800,
    height: 1000,
    alt: 'A dressmaker sewing at her machine in her stall at the African Mall market, Gaborone',
    caption: 'Manufacturing · African Mall',
    credit: {
      author: 'Blackgirlmighty',
      licence: 'CC0 1.0',
      licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'https://commons.wikimedia.org/wiki/File:Lady_Textiles.jpg',
    },
  },
  mainMall: {
    src: mainMall,
    width: 1000,
    height: 750,
    alt: "People walking past shops and a trader's stall in the Main Mall, Gaborone",
    caption: 'Trade and services · Main Mall',
    credit: {
      author: 'CNJerem',
      licence: 'CC BY 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
      source: 'https://commons.wikimedia.org/wiki/File:Gaborone_Main_Mall_20200211.jpg',
    },
  },
  swallow: {
    src: swallow,
    width: 900,
    height: 900,
    alt: 'A barn swallow in flight, wings spread',
    caption: 'Peolwane, the barn swallow',
    credit: {
      author: 'Derek Keats, Johannesburg',
      licence: 'CC BY 2.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
      source: 'https://commons.wikimedia.org/wiki/File:Barn_swallow,_Hirundo_rustica_(36874830542).jpg',
    },
  },
} as const satisfies Record<string, Photo>

/**
 * A cover photo for a challenge card, chosen from the challenge's title: farming and water, digital and youth, or
 * Gaborone as the default. Challenges carry no image of their own in the data, so this keeps the cards from being
 * text alone without inventing anything about the challenge.
 */
export function challengeCover(title: string): Photo {
  const t = title.toLowerCase()
  if (/(water|agri|farm|crop|livestock|food)/.test(t)) return PHOTOS.farmer
  if (/(digital|youth|tech|data|ict|software|app)/.test(t)) return PHOTOS.techStand
  if (/(manufactur|textile|craft|industr)/.test(t)) return PHOTOS.dressmaker
  if (/(trade|retail|tourism|service)/.test(t)) return PHOTOS.mainMall
  return PHOTOS.gaboroneCbd
}

/** Every photo, for the credits on the About page. */
export const PHOTO_LIST: readonly Photo[] = Object.values(PHOTOS)
