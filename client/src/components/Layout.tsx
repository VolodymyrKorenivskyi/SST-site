import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        padding: '1rem 2rem', 
        backgroundColor: '#1a1a1a',
        borderBottom: '1px solid #333'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
          SST Site - Термінали самообслуговування
        </h1>
      </header>
      <main style={{ flex: 1, padding: '2rem' }}>
        {children}
      </main>
      <footer style={{ 
        padding: '1rem 2rem', 
        backgroundColor: '#1a1a1a',
        borderTop: '1px solid #333',
        textAlign: 'center',
        color: '#888'
      }}>
        © 2024 SST Site
      </footer>
    </div>
  );
}

export default Layout;
