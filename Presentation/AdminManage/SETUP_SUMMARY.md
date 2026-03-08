# FSD Architecture - Quick Reference

## ✅ Thiết lập hoàn thành

Dự án Admin Management đã được thiết lập với kiến trúc FSD (Feature-Sliced Design).

## 📁 Cấu trúc thư mục

```
src/
├── app/                          # ⚙️ Khởi tạo ứng dụng, routing
│   ├── App.tsx                   # Component chính
│   └── index.ts
│
├── pages/                        # 📄 Các trang của ứng dụng
│   └── index.ts
│
├── widgets/                      # 🧩 Composite components
│   └── index.ts
│
├── features/                     # ⚡ Features độc lập
│   └── index.ts
│
├── entities/                     # 🏠 Business entities, models
│   └── index.ts
│
└── shared/                       # 🔗 Dùng chung toàn hệ thống
    ├── ui/                       # UI components
    │   └── index.ts
    ├── utils/                    # Utility functions
    │   └── index.ts
    ├── hooks/                    # Custom React hooks
    │   └── index.ts
    ├── types/                    # Type definitions
    │   └── index.ts
    └── index.ts
```

## 🔄 Dependency Flow

```
Chỉ import từ các layer bên dưới:

app → pages → widgets → features → entities → shared
                         ↓           ↓         ↓
                    (Có thể import từ bản thân hoặc phía dưới)
```

## 📝 Imports - Sử dụng Path Aliases

```typescript
// ✅ Cách sử dụng (@/ là alias cho src/)
import { MyComponent } from '@/widgets';
import { useMyHook } from '@/features';
import { Button } from '@/shared/ui';
import type { MyType } from '@/entities';

// ❌ Tránh sử dụng relative paths
import { MyComponent } from '../../../widgets';
```

## 🚀 Cách bắt đầu

### 1. Thêm một UI Component vào Shared

```typescript
// src/shared/ui/Button/Button.tsx
export const Button = ({ children, onClick }) => (
  <button onClick={onClick}>{children}</button>
);

// src/shared/ui/Button/index.ts
export { Button } from './Button';

// src/shared/ui/index.ts
export * from './Button';
```

### 2. Tạo một Entity mới

```typescript
// src/entities/user/types/User.types.ts
export type User = {
  id: string;
  name: string;
  email: string;
};

// src/entities/user/index.ts
export type { User } from './types/User.types';
```

### 3. Tạo một Feature mới

```
src/features/user-management/
├── components/
│   ├── UserList.tsx
│   └── UserForm.tsx
├── hooks/
│   └── useUsers.ts
├── types/
│   └── types.ts
└── index.ts
```

```typescript
// src/features/user-management/index.ts
export { UserList } from './components/UserList';
export { UserForm } from './components/UserForm';
export { useUsers } from './hooks/useUsers';
```

### 4. Tạo một Widget (Composite Component)

```typescript
// src/widgets/user-card/UserCard.tsx
import { User } from '@/entities';
import { Button } from '@/shared/ui';

export const UserCard = ({ user }) => (
  <div>
    <h3>{user.name}</h3>
    <Button onClick={() => {}}>Edit</Button>
  </div>
);

// src/widgets/user-card/index.ts
export { UserCard } from './UserCard';
```

### 5. Tạo một Page

```typescript
// src/pages/users/UsersPage.tsx
import { UserList } from '@/features';

export const UsersPage = () => (
  <div>
    <h1>Users</h1>
    <UserList />
  </div>
);

// src/pages/users/index.ts
export { UsersPage } from './UsersPage';
```

### 6. Kết nối trong App

```typescript
// src/app/App.tsx
import { UsersPage } from '@/pages';

export const App = () => {
  return (
    <div className="app">
      <UsersPage />
    </div>
  );
};
```

## 📚 Tài liệu

- **FSD_GUIDE.md** - Hướng dẫn chi tiết về FSD Architecture
- **FSD_EXAMPLES.ts** - Ví dụ mã sư dụng FSD

## ⚙️ Cấu hình đã được cập nhật

✅ `tsconfig.app.json` - Path aliases (@/*)  
✅ `vite.config.ts` - Resolve aliases  
✅ `src/main.tsx` - Import từ app layer  
✅ `src/app/App.tsx` - Component chính  

## 🎯 Best Practices

1. **Mỗi thư mục có một `index.ts`** để export công khai API
2. **Tuân thủ dependency flow** - không import từ layer trên
3. **Một feature/entity per folder** - giữ mọi thứ gọn gàng
4. **Sử dụng barrel exports** - `export * from './components'`
5. **TypeScript types** - Luôn define types trong `types/` hoặc `types.ts`

## 🔗 Liên kết

- [Feature-Sliced Design Docs](https://feature-sliced.design/)
- [FSD Best Practices](https://feature-sliced.design/docs)
- [FSD Quick Start Guide](https://feature-sliced.design/docs/get-started/overview)
