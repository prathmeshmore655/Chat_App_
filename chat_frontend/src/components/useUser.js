import { useState, useEffect } from 'react';
import api from './api';

export default function useUser() {
  const [user, setUser] = useState(null);
  const [userError, setUserError] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      setLoadingUser(true);
      setUserError('');
      try {
        const res = await api.get('/get-user/');
        if (mounted) {
          setUser(res.data);
        }
      } catch (err) {
        if (mounted) {
          setUserError('Failed to fetch user');
          console.error('Failed to fetch user:', err);
        }
      } finally {
        if (mounted) {
          setLoadingUser(false);
        }
      }
    };

    fetchUser();

    return () => {
      mounted = false;
    };
  }, []);

  return { user, userError, loadingUser };
}