import '../index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { AppRouter } from './router/AppRouter';

// The original landing UI for the app is preserved below as a reference
// in case we want to restore the pre-routing welcome screen.
//
// export const App = () => {
//   return (
//     <div style={{ padding: '2rem', textAlign: 'center' }}>
//       <h1>Welcome to FSD Architecture</h1>
//       <p>Admin Management System</p>
//       {/* Add your routes and pages here */}
//     </div>
//   );
// };

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  );
};
