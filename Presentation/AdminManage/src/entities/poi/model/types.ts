export type PoiLocalizedData = {
  langCode: string
  name: string
  description: string
  descriptionText: string
  descriptionAudio: string
}

export type PoiPosition = {
  type: string
  lat: number
  lng: number
}

export type Poi = {
  id: string
  order: number
  range: number
  thumbnail: string
  banner: string
  position: PoiPosition
  localizedData: PoiLocalizedData[]
}