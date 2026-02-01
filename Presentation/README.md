# Audio Tour / Food Street Guide System

A modern React + TypeScript web application for audio-guided tours with GPS-based location tracking, geofence detection, and multi-language narration support.

## Features

- **Location Tracking**: Real-time GPS tracking with permission handling
- **Geofence Engine**: Automatic POI detection based on user proximity
- **Narration Engine**: Audio playback with Text-to-Speech fallback
- **Multi-Language Support**: Support for English and Vietnamese (easily extensible)
- **Interactive Map**: Visual map display with user location and POI markers
- **Responsive Design**: Mobile-first, fully responsive UI
- **Bottom Sheet Interface**: Collapsible POI information panel

## Project Structure

```
src/
  api/
    poiApi.ts                 # API service for fetching POI data
  dto/
    PoiDto.ts                 # TypeScript interfaces for POI data
  features/
    location/
      LocationService.ts      # GPS tracking service
      useLocation.ts          # React hook for location tracking
    geofence/
      GeofenceService.ts      # Geofence detection logic
    narration/
      NarrationService.ts     # Audio playback & TTS service
    map/
      MapView.tsx             # Map component
      MapMarker.tsx           # POI marker component
      MapView.module.css
      MapMarker.module.css
  components/
    LanguageSelector.tsx      # Language selector component
    LanguageSelector.module.css
    PoiInfoPanel.tsx          # POI information panel
    PoiInfoPanel.module.css
  pages/
    HomePage.tsx              # Main page component
    HomePage.module.css
  styles/
    global.css                # Global styles & animations
  App.tsx                      # Root component
  main.tsx                     # Entry point
```

## Key Services

### LocationService
Manages GPS permission requests and continuous location tracking using the Geolocation API.

```typescript
const locationService = LocationService.getInstance();
await locationService.startTracking();
const unsubscribe = locationService.subscribe((location) => {
  // Handle location update
});
```

### GeofenceService
Detects when users enter POI detection ranges and triggers events.

```typescript
const geofenceService = GeofenceService.getInstance();
geofenceService.initialize(pois);
geofenceService.checkGeofence(userLocation);
const unsubscribe = geofenceService.subscribe((event) => {
  // Handle POI entry/exit
});
```

### NarrationService
Handles audio playback and text-to-speech narration for POI descriptions.

```typescript
const narrationService = NarrationService.getInstance();
narrationService.setLanguage('en');
await narrationService.playPoi(poi, autoPlay);
narrationService.pause();
narrationService.resume();
```

## Usage

1. **Install dependencies**:
```bash
npm install
# or
yarn install
```

2. **Set environment variables** (optional):
Create a `.env.local` file:
```
REACT_APP_API_ENDPOINT=http://your-api-endpoint/api
```

3. **Run development server**:
```bash
npm run dev
```

4. **Build for production**:
```bash
npm run build
```

## API Integration

The app fetches POI data from an API endpoint. Mock data is provided for development.

### Expected API Response

```json
[
  {
    "id": "poi-1",
    "order": 1,
    "range": 50,
    "thumbnail": "https://...",
    "banner": "https://...",
    "position": {
      "type": "Point",
      "lat": 21.0285,
      "lng": 105.8542
    },
    "localizedData": [
      {
        "langCode": "en",
        "name": "Location Name",
        "description": "Short description",
        "descriptionText": "Long text description",
        "descriptionAudio": "https://audio-url.mp3"
      }
    ]
  }
]
```

## UI Components

### MapView
- Shows user location and POI markers
- Displays active POI with pulse animation
- Canvas-based map rendering

### PoiInfoPanel
- Bottom sheet interface
- Collapsible/expandable
- Play/Pause/Resume audio controls
- POI metadata display

### LanguageSelector
- Dropdown language switcher
- Supports English and Vietnamese
- Easily extensible for additional languages

## Animations

- **Pulse animation**: Active POI marker
- **Slide-up animation**: Bottom panel expansion
- **Fade transitions**: Smooth UI changes
- **Expand rings**: User location indicator

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Permissions Required

- **Geolocation**: For GPS tracking
- **Microphone** (optional): For voice-based features

## Performance Considerations

- Location updates: 1 second debounce
- Geofence checks: Throttled to prevent rapid re-triggers
- Map rendering: Canvas-based for smooth performance
- Lazy loading: POI data fetched on app initialization

## Extensibility

### Add New Language

1. Update `LANGUAGES` array in `LanguageSelector.tsx`
2. Add language code support in `NarrationService.getLangCodeForTTS()`
3. Provide localized data in API response

### Integrate Real Maps

Replace the canvas-based MapView with:
- Google Maps API
- Mapbox GL
- OpenStreetMap (Leaflet)

### Custom Audio Sources

Extend `NarrationService` to support:
- Stream-based audio
- Custom audio APIs
- Streaming services

## Development Notes

- **State Management**: React hooks with service singletons
- **Styling**: CSS Modules for component encapsulation
- **Type Safety**: Full TypeScript coverage
- **Service Architecture**: Decoupled, testable services
- **No External UI Framework**: Pure CSS and React

## Future Enhancements

- [ ] Route planning and navigation
- [ ] Offline mode support
- [ ] User progress tracking
- [ ] Social sharing features
- [ ] Advanced map features (layers, filters)
- [ ] Analytics integration
- [ ] Real Google Maps integration

## License

MIT

## Support

For issues or questions, please open an issue in the repository.
