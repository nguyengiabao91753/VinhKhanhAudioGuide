# FSD Architecture - Feature-Sliced Design

Dự án này sử dụng **Feature-Sliced Design (FSD)** - một kiến trúc tiên tiến để tổ chức các dự án front-end một cách có hệ thống và có thể mở rộng.

## Cấu trúc thư mục

```
src/
├── app/                    # Layer: Ứng dụng
├── pages/                  # Layer: Trang
├── widgets/                # Layer: Widgets
├── features/               # Layer: Tính năng
├── entities/               # Layer: Thực thể
└── shared/                 # Layer: Chia sẻ
    ├── ui/                 # Thành phần UI tái sử dụng
    ├── utils/              # Hàm tiện ích
    ├── hooks/              # Custom React hooks
    └── types/              # Kiểu và giao diện chung
```

## Các Layer trong FSD

### 1. **app/** - Ứng dụng
Khởi tạo ứng dụng, cấu hình global providers, routing chính.

**Khi nào sử dụng:**
- Cấu trúc routing của ứng dụng
- Global providers (AuthContext, ThemeContext, v.v.)
- App initialization logic

**Ví dụ:**
```
app/
├── App.tsx
├── Router.tsx
└── layout/
```

### 2. **pages/** - Trang
Các thành phần trang được kết nối với routes.

**Khi nào sử dụng:**
- Các trang chính (HomePage, ProfilePage, SettingsPage)
- Layout cho từng trang
- Page-level logic

**Ví dụ:**
```
pages/
├── dashboard/
│   └── DashboardPage.tsx
├── profile/
│   └── ProfilePage.tsx
└── settings/
    └── SettingsPage.tsx
```

### 3. **widgets/** - Widgets
Các thành phần tái sử dụng được tổ hợp từ features và entities.

**Khi nào sử dụng:**
- Composite components (UserCard, ProductFilters)
- Components có multiple responsibilities
- Large, reusable UI blocks

**Ví dụ:**
```
widgets/
├── user-card/
│   ├── UserCard.tsx
│   └── index.ts
├── product-filters/
│   ├── ProductFilters.tsx
│   └── index.ts
```

### 4. **features/** - Tính năng
Các tính năng độc lập của ứng dụng.

**Khi nào sử dụng:**
- Auth, Search, Notifications
- User interactions
- Feature-specific logic

**Ví dụ:**
```
features/
├── auth/
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── index.ts
├── search/
│   ├── components/
│   └── index.ts
```

### 5. **entities/** - Thực thể
Business entities, data models, domain logic.

**Khi nào sử dụng:**
- Data models (User, Product, Order)
- Business logic
- API services

**Ví dụ:**
```
entities/
├── user/
│   ├── model/
│   ├── types/
│   └── index.ts
├── product/
│   ├── model/
│   └── index.ts
```

### 6. **shared/** - Chia sẻ
UI components, utilities, hooks, types được sử dụng toàn bộ ứng dụng.

**shared/ui/** - Các thành phần UI tái sử dụng (Button, Input, Modal)
**shared/utils/** - Các hàm tiện ích chung
**shared/hooks/** - Custom React hooks
**shared/types/** - Kiểu TypeScript toàn cục

**Ví dụ:**
```
shared/
├── ui/
│   ├── Button/
│   ├── Input/
│   └── Modal/
├── utils/
│   ├── api.ts
│   └── helpers.ts
├── hooks/
│   ├── useAuth.ts
│   └── useLocalStorage.ts
└── types/
    ├── common.ts
    └── api.ts
```

## Nguyên tắc Dependency Flow (Quy tắc quan trọng!)

Các layer chỉ có thể import từ các layer bên dưới chúng:

```
app → pages → widgets → features → entities → shared
 ↓      ↓        ↓         ↓         ↓        ↓
 ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
 (Chỉ xuất hiện chiều này!)
```

**Ví dụ đúng:**
```typescript
// ✅ Hợp lệ
// pages/dashboard/DashboardPage.tsx
import { UserCard } from '@/widgets';
import { User } from '@/entities';
import { Button } from '@/shared/ui';
```

**Ví dụ sai:**
```typescript
// ❌ KHÔNG hợp lệ
// shared/Button.tsx
import { features } from '@/features';  // shared không thể import từ features
```

## Cách bắt đầu

### Thêm một feature mới

1. **Tạo thư mục feature:**
```
features/
└── my-feature/
    ├── components/
    │   └── MyFeature.tsx
    ├── hooks/
    │   └── useMyFeature.ts
    ├── types/
    │   └── types.ts
    └── index.ts
```

2. **Export từ index.ts:**
```typescript
// features/my-feature/index.ts
export { MyFeature } from './components/MyFeature';
export { useMyFeature } from './hooks/useMyFeature';
export type { MyFeatureProps } from './types/types';
```

3. **Sử dụng trong widgets hoặc pages:**
```typescript
import { MyFeature, useMyFeature } from '@/features';
```

### Thêm entity mới

1. **Tạo thư mục entity:**
```
entities/
└── product/
    ├── model/
    │   └── Product.ts
    ├── types/
    │   └── types.ts
    └── index.ts
```

2. **Export từ index.ts:**
```typescript
// entities/product/index.ts
export { Product } from './model/Product';
export type { ProductType, ProductId } from './types/types';
```

## Best Practices

1. **Sử dụng barrel exports** - Mọi thư mục nên có file `index.ts` để export công khai API
2. **Tránh circular dependencies** - Tuân thủ dependency flow
3. **One feature per folder** - Mỗi feature có thư mục riêng
4. **Public vs Private** - Chỉ export những gì cần thiết từ `index.ts`
5. **Naming conventions:**
   - Folders: kebab-case (my-feature)
   - Files: PascalCase cho components (MyComponent.tsx)
   - Files: camelCase cho utils/hooks (useAuth.ts, helpers.ts)

## TypeScript Path Aliases

Được cấu hình trong `tsconfig.json`:
```json
"paths": {
  "@/*": ["./src/*"]
}
```

Sử dụng:
```typescript
import { MyComponent } from '@/widgets';
import { useAuth } from '@/features';
```

## Tài liệu tham khảo

- [Feature-Sliced Design Official](https://feature-sliced.design/)
- [FSD Best Practices](https://feature-sliced.design/docs)
