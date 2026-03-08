/* Example structure and usage of FSD Architecture */

// ============================================
// EXAMPLE: Adding a new User Management Feature
// ============================================

/*
Feature structure:

src/features/user-management/
├── components/
│   ├── UserList.tsx
│   ├── UserForm.tsx
│   └── UserModal.tsx
├── hooks/
│   ├── useUsers.ts
│   └── useUserForm.ts
├── types/
│   └── user.types.ts
├── api/
│   └── userApi.ts
└── index.ts

---

src/entities/user/
├── model/
│   └── User.ts
├── types/
│   └── User.types.ts
└── index.ts

---

src/widgets/user-card/
├── UserCard.tsx
├── UserCard.css
└── index.ts

---

src/pages/users/
├── UsersPage.tsx
└── index.ts

---

src/shared/ui/
├── Button/
│   ├── Button.tsx
│   └── index.ts
├── Input/
│   ├── Input.tsx
│   └── index.ts
└── Modal/
    ├── Modal.tsx
    └── index.ts
*/

// ============================================
// EXAMPLE: File contents
// ============================================

// ---- shared/ui/Button/Button.tsx ----
/*
import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled,
}) => {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};
*/

// ---- shared/ui/Button/index.ts ----
/*
export { Button } from './Button';
export type { ButtonProps } from './Button';
*/

// ---- entities/user/types/User.types.ts ----
/*
export type UserId = string | number;

export interface User {
  id: UserId;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}
*/

// ---- entities/user/index.ts ----
/*
export type { User, UserId } from './types/User.types';
*/

// ---- features/user-management/types/user.types.ts ----
/*
import { User } from '@/entities';

export interface UserFilters {
  search?: string;
  role?: User['role'];
  sortBy?: 'name' | 'createdAt';
}

export interface UserFormData {
  name: string;
  email: string;
  role: 'admin' | 'user';
}
*/

// ---- features/user-management/hooks/useUsers.ts ----
/*
import { useState, useEffect } from 'react';
import { User } from '@/entities';

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch users
    setLoading(true);
    // API call here
    setLoading(false);
  }, []);

  return { users, loading };
};
*/

// ---- features/user-management/components/UserList.tsx ----
/*
import React from 'react';
import { User } from '@/entities';
import { UserCard } from '@/widgets';

interface UserListProps {
  users: User[];
}

export const UserList: React.FC<UserListProps> = ({ users }) => {
  return (
    <div className="user-list">
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
};
*/

// ---- features/user-management/index.ts ----
/*
export { UserList } from './components/UserList';
export { UserForm } from './components/UserForm';
export { useUsers } from './hooks/useUsers';
export { useUserForm } from './hooks/useUserForm';
export type { UserFilters, UserFormData } from './types/user.types';
*/

// ---- widgets/user-card/UserCard.tsx ----
/*
import React from 'react';
import { User } from '@/entities';
import { Button } from '@/shared/ui';

interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (userId: User['id']) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete }) => {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <p>Role: {user.role}</p>
      <div className="actions">
        {onEdit && <Button label="Edit" onClick={() => onEdit(user)} />}
        {onDelete && <Button label="Delete" onClick={() => onDelete(user.id)} />}
      </div>
    </div>
  );
};
*/

// ---- widgets/user-card/index.ts ----
/*
export { UserCard } from './UserCard';
export type { UserCardProps } from './UserCard';
*/

// ---- pages/users/UsersPage.tsx ----
/*
import React from 'react';
import { UserList, useUsers } from '@/features';
import { Button } from '@/shared/ui';

export const UsersPage: React.FC = () => {
  const { users, loading } = useUsers();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="users-page">
      <h1>Users Management</h1>
      <Button label="Add New User" onClick={() => {}} />
      <UserList users={users} />
    </div>
  );
};
*/

// ---- pages/users/index.ts ----
/*
export { UsersPage } from './UsersPage';
*/

// ---- app/Router.tsx ----
/*
import React from 'react';
import { UsersPage } from '@/pages';

export const Router: React.FC = () => {
  // Configure your routes here
  return (
    <div>
      <UsersPage />
    </div>
  );
};
*/

// ---- app/App.tsx ----
/*
import React from 'react';
import { Router } from './Router';
import '../index.css';

export const App: React.FC = () => {
  return (
    <div className="app">
      <Router />
    </div>
  );
};
*/

export {};
