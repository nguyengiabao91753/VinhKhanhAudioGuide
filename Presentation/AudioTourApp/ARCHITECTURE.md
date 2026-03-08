# AudioTour App - FSD Architecture Documentation

## 🏗️ Architecture Overview

Này project sử dụng **Feature Sliced Design (FSD)** - một architecture pattern hiện đại giúp tổ chức code dễ bảo trì, mở rộng và kiểm thử.

### Directory Structure

```
src/
├── app/              # Application root & global configuration
├── pages/            # Page-level route components
├── widgets/          # Composite components combining features & entities
├── features/         # Feature-specific slices (organized by domain)
├── entities/         # Core business entities (data models)
├── shared/           # Reusable utilities, types, and components
└── styles/          # Global styles
```

---

## 📚 Detailed Layer Descriptions

### **1. `app/` - Application Layer**

**Mục đích:** Setup toàn bộ ứng dụng, global configuration, routing

**Nội dung:**
- `App.tsx` - Root component
- Global providers, theme setup, error boundaries

**Luật Dependency:**
- ✅ Có thể import từ: `pages/`, `shared/`, `entities/`, `features/`
- ❌ KHÔNG import từ: `widgets/`, `pages/` (trừ root page)

**Ví dụ:**
```typescript
// src/app/App.tsx
import HomePage from '../pages/HomePage';

export default function App() {
  return <HomePage />;
}
```

---

### **2. `pages/` - Pages Layer**

**Mục đích:** Các trang/route của ứng dụng

**Nội dung:**
- `HomePage.tsx` - Trang chính
- Mỗi trang là một layout kết hợp nhiều features và widgets

**Luật Dependency:**
- ✅ Có thể import từ: `widgets/`, `features/`, `shared/`, `entities/`
- ❌ KHÔNG import từ: `app/`, `pages/` (khác pages)

**Ví dụ:**
```typescript
// src/pages/HomePage.tsx
import { MapView } from '../features/map';
import { PoiInfoPanel } from '../widgets/poiPanel';

export default function HomePage() {
  // Compose features và widgets để tạo trang
  return (
    <>
      <MapView /* ... */ />
      <PoiInfoPanel /* ... */ />
    </>
  );
}
```

---

### **3. `widgets/` - Widgets Layer**

**Mục đích:** Các component phức tạp kết hợp từ nhiều features & entities

**Nội dung:**
- `poiPanel/` - Widget hiển thị thông tin POI
- Mỗi widget chứa:
  - `index.ts` - Barrel export
  - `*.tsx` - Actual component

**Luật Dependency:**
- ✅ Có thể import từ: `entities/`, `features/`, `shared/`
- ❌ KHÔNG import từ: `app/`, `pages/`, `widgets/` (khác widgets)

**Ví dụ:**
```typescript
// src/widgets/poiPanel/index.ts
export { PoiInfoPanel } from './PoiInfoPanel';
```

---

### **4. `features/` - Features Layer**

**Mục đích:** Tổ chức code theo domain (location, map, narration, etc.)

**Cấu trúc của mỗi feature:**
```
features/
├── location/
│   ├── ui/                    # UI components
│   │   └── (nếu có)
│   ├── model/                 # Hooks, state management
│   │   └── useLocation.ts
│   ├── lib/                   # Business logic, services
│   │   └── LocationService.ts
│   ├── api/                   # API calls
│   │   └── (nếu có)
│   └── index.ts               # Barrel export
├── map/
├── narration/
├── geofence/
└── languageSelection/
```

**Mỗi phần:**
- **`ui/`** - React components
- **`model/`** - Custom hooks, state management (zustand, jotai, etc.)
- **`lib/`** - Business logic, services, utilities
- **`api/`** - API calls, data fetching

**Luật Dependency:**
- ✅ Có thể import từ: `shared/`, `entities/`
- ✅ Có thể import từ features khác (không recommended, sử dụng middleware)
- ❌ KHÔNG import từ: `app/`, `pages/`, `widgets/`

**Ví dụ cấu trúc feature:**
```typescript
// src/features/location/index.ts
export { useLocation } from './model/useLocation';
export { LocationService, type Location } from './lib/LocationService';

// src/features/location/lib/LocationService.ts
export class LocationService {
  static getInstance() { /* ... */ }
  public start() { /* ... */ }
}

// src/features/location/model/useLocation.ts
export function useLocation() {
  // Sử dụng LocationService và return location state
}
```

---

### **5. `entities/` - Entities Layer**

**Mục đích:** Core business entities (data models, types)

**Nội dung:**
```
entities/
└── poi/
    ├── model.ts       # Interfaces & types
    └── index.ts       # Barrel export
```

**Luật Dependency:**
- ✅ Có thể import từ: `shared/`
- ❌ KHÔNG import từ: bất kỳ layer nào khác

**Ví dụ:**
```typescript
// src/entities/poi/model.ts
export interface PoiDto {
  id: string;
  order: number;
  position: Position;
  localizedData: LocalizedData[];
}

// src/entities/poi/index.ts
export type { PoiDto, Position, LocalizedData } from './model';
```

---

### **6. `shared/` - Shared Layer**

**Mục đích:** Utilities, types, components dùng chung cho toàn bộ app

**Cấu trúc:**
```
shared/
├── ui/         # Reusable UI components
├── lib/        # Utilities, helpers, API calls
├── types/      # Common types
└── assets/     # Shared images, icons
```

**Nội dung hiệu hành:**
- `lib/poiApi.ts` - API functions
- Utility functions, helpers
- Common types

**Luật Dependency:**
- ❌ KHÔNG import từ: bất kỳ layer nào khác

**Ví dụ:**
```typescript
// src/shared/lib/poiApi.ts
export async function fetchPois(): Promise<PoiDto[]> {
  // Fetch POI data from API
}
```

---

## 🔄 Dependency Rules (Nguyên Tắc Phụ Thuộc)

**Tóm tắt:**

```
app/ → pages/ → widgets/ → features/ → entities/
  ↘                         ↘               ↙
                          shared/ (có thể import từ bất cứ đâu)
```

**Cụ thể:**

| Layer | Can Import From |
|-------|-----------------|
| `app/` | `app/`, `pages/`, `shared/`, `entities/` |
| `pages/` | `pages/`, `widgets/`, `features/`, `shared/`, `entities/` |
| `widgets/` | `widgets/`, `features/`, `shared/`, `entities/` |
| `features/` | `features/`, `shared/`, `entities/` |
| `entities/` | `entities/`, `shared/` |
| `shared/` | `shared/` chỉ |

---

## 💡 Best Practices

### ✅ DO

1. **Barrel Exports (index.ts)** - Export công khai qua `index.ts`
   ```typescript
   // src/features/map/index.ts
   export { MapView } from './ui/MapView';
   ```

2. **Limit Features Coupling** - Features nên độc lập
   ```typescript
   // src/pages/HomePage.tsx - tổng hợp các features
   import { MapView } from '../features/map';
   import { PoiInfoPanel } from '../widgets/poiPanel';
   ```

3. **Local Types** - Types nên định nghĩa trong feature
   ```typescript
   // src/features/map/lib/types.ts
   export interface MapConfig { /* ... */ }
   ```

### ❌ DON'T

1. **Cross-Feature Imports** - Tránh features import từ features khác trực tiếp
   ```typescript
   // ❌ BAD
   import { useLocation } from '../location/model/useLocation';
   
   // ✅ GOOD - qua barrel export
   import { useLocation } from '../location';
   ```

2. **Feature Imports Higher Layers** - Features KHÔNG được import từ pages/app/widgets
   ```typescript
   // ❌ BAD
   // src/features/map/lib/MapView.tsx
   import { HomePage } from '../../pages/HomePage';
   ```

3. **Circular Dependencies** - Tránh dependency vòng
   ```typescript
   // ❌ BAD
   // A imports B và B imports A
   ```

---

## 🚀 Scaling Guide

Khi thêm features mới:

```bash
mkdir -p src/features/newFeature/{ui,model,lib,api}
```

Tạo files:
```typescript
// src/features/newFeature/lib/NewFeatureService.ts
export class NewFeatureService { /* ... */ }

// src/features/newFeature/model/useNewFeature.ts
export function useNewFeature() { /* ... */ }

// src/features/newFeature/index.ts
export { useNewFeature } from './model/useNewFeature';
export { NewFeatureService } from './lib/NewFeatureService';
```

---

## 📝 Notes

- **No circular dependencies** - Cấu trúc phải là tree, không có cycle
- **Feature independence** - Features nên có thể được remove/reuse độc lập
- **Type safety** - Export types qua barrel exports
- **Performance** - Features được code-split tự động

---

## 🔗 Resources

- [Feature Sliced Design](https://feature-sliced.design/)
- [Project Structure Docs](https://feature-sliced.design/docs/reference)
