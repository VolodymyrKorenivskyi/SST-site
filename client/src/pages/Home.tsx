import { useEffect, useState } from 'react';
import { apiClient } from '../services/api';

function Home() {
  const [apiStatus, setApiStatus] = useState<string>('Перевірка...');

  useEffect(() => {
    apiClient.get('/api')
      .then((response) => {
        setApiStatus(`✅ ${response.data.message} v${response.data.version}`);
      })
      .catch((error) => {
        setApiStatus(`❌ Помилка підключення до API: ${error.message}`);
      });
  }, []);

  return (
    <div>
      <h2>Головна сторінка</h2>
      <p style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
        Статус API: {apiStatus}
      </p>
      <div style={{ marginTop: '2rem' }}>
        <p>Тут буде інтерфейс для управління терміналами самообслуговування.</p>
      </div>
    </div>
  );
}

export default Home;
