# 📋 POC ANALYSIS & IMPLEMENTATION PLAN

**Last Updated:** 2024  
**Status:** Reading Requirements

---

## 🎯 UI Flow Analysis (từ ảnh đính kèm)

### Flow Diagram:
```
HomePage (Tour List)
  └─ Click Tour Card → TourDetailPage
        └─ Click "Bắt đầu Trải nghiệm" → TourActivePage (Map View)
             ├─ Show Itinerary List (Stops)
             ├─ Show User on Map
             ├─ Show POI Markers with Geofence
             └─ Click POI Marker → POI Detail Modal
                    ├─ Show Banner, Name, Description
                    └─ Audio Player + "Tiếp tục hành trình"
```

---

## 📊 UI Components Breakdown

| Screen | Components | Data Needed |
|--------|------------|-------------|
| **HomePage** | Header (Title, LangSelector), Tour Cards List | Tours list |
| **TourDetailPage** | Header (Back), Hero/Banner, Tour Info (duration, distance, stops count), CTA Button | Tour details |
| **TourRoutePage** | Header (Back), Stops Timeline/List, "Bắt đầu" CTA | Tour stops, POIs |
| **TourActivePage** | Header (Back, Title), Map, Itinerary Panel (Stops List), POI Detail Bottom Sheet | User location, POIs, Tour progress |
| **POI Detail Modal** | Banner, Title, Description, Audio Player, CTA Button | POI details, audio |

---

## 🔍 Current Codebase Status

### ✅ ALREADY EXISTS (No-touch):
- `LocationService` - GPS tracking ✓
- `GeofenceService` - Distance calculation ✓
- `NarrationService` - Audio playback ✓
- `MapView` - Mapbox integration ✓
- `LanguageSelector` - Lang switching ✓
- `PoiInfoPanel` - POI display widget ✓
- `HomePage.tsx` - Basic page structure ✓

### ❌ MISSING (Need to Implement):
- **Tour model/entity** - `TourDto` interface
- **Tour API** - `fetchTours()`, async data loading
- **Pages**:
  - TourListPage (refactored HomePage)
  - TourDetailPage
  - TourActivePage (enhanced HomePage with routing)
- **Components**:
  - TourCard (card component)
  - TourInfoPanel (tour meta info)
  - ItineraryList (stops timeline/list)
  - POIDetailModal (POI info popup)
- **Routing** - React Router setup in App.tsx

### ⚠️ MINIMAL CHANGE NEEDED:
- HomePage → convert to route-aware component
- App.tsx → add React Router

---

## 🛠️ Implementation Plan

### Phase 1: Data Models & API (5 min)
1. Create `TourDto` interface
2. Create Mock Tour Data
3. Create `fetchTours()` API function

### Phase 2: Pages & Routing (15 min)
1. Setup React Router in App.tsx
2. Create/Refactor pages:
   - `TourListPage` (index/home)
   - `TourDetailPage` (show tour info, CTA to start)
   - `TourActivePage` (map + tracking + itinerary)

### Phase 3: UI Components (15 min)
1. TourCard component
2. TourInfoPanel component
3. ItineraryList component
4. POIDetailModal component

### Phase 4: Integration & Polish (10 min)
1. Wire components to pages
2. Add loading/error states
3. Test end-to-end flow

**Total Estimated Time:** ~45 min

---

## 📝 API Assumptions

### Tour Endpoints Expected:
```
GET /tours/get-all → List of tours
GET /tours/{id} → Tour detail
GET /pois/get-all → POIs (already implemented)
```

### Mock Tour Data Structure:
```typescript
interface TourDto {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  distance: number; // in km
  thumbnail: string;
  banner: string;
  poiOrder: string[]; // ref to POI ids
  localizedData: LocalizedData[]; // multi-lang support
}
```

---

## 🎯 Success Criteria (Test Checklist)

- [ ] HomePage shows tour list with cards
- [ ] Click tour card → TourDetailPage with duration, distance, stops count
- [ ] Click "Bắt đầu Trải nghiệm" → TourActivePage
- [ ] TourActivePage shows map with user location
- [ ] POI markers visible on map
- [ ] Click marker → POI detail modal/sheet
- [ ] Audio player works in POI detail
- [ ] Language selector switches UI language
- [ ] Geofence detection works (auto-play narration on proximity)
- [ ] Back navigation works

---

## ⚠️ Unanswered Questions / Assumptions

1. **Tour API Endpoint** - Assuming `/tours/get-all`, confirm if different?
2. **Tour-POI Mapping** - Assuming `tour.poiOrder` array, confirm structure?
3. **POI Detail Modal** - Bottom sheet or modal popup? (from UI looks like bottom sheet)
4. **Routing Type** - Client-side or URL-based? (assuming React Router)
5. **State Management** - Use React hooks (useState/Context) or Redux? (assuming hooks)
6. **Localization** - Just language or also region? (assuming language only: vi, en)

---

## 📂 Files to Create/Modify

### New Files (Create):
```
src/entities/tour/
  ├── model.ts (TourDto interface)
  └── index.ts

src/features/tour/
  ├── lib/
  │   └── tourApi.ts (fetchTours)
  └── index.ts

src/pages/
  ├── TourListPage.tsx
  ├── TourDetailPage.tsx
  └── TourActivePage.tsx

src/widgets/
  ├── tourCard/
  │   ├── TourCard.tsx
  │   └── index.ts
  ├── tourInfoPanel/
  │   ├── TourInfoPanel.tsx
  │   └── index.ts
  ├── itineraryList/
  │   ├── ItineraryList.tsx
  │   └── index.ts
  └── poiDetailModal/
      ├── POIDetailModal.tsx
      └── index.ts
```

### Modified Files (Update):
```
src/app/App.tsx (add routing)
src/main.tsx (no change if routing in App.tsx)
```

---

## 🚀 Next Steps

1. Confirm API endpoints with backend team
2. Implement data models
3. Implement pages
4. Implement components
5. Wire everything together
6. Test end-to-end

