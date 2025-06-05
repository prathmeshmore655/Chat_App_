import { useState, useEffect, useCallback } from 'react';
import api from './api';

export default function useContacts() {
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contactsError, setContactsError] = useState('');

  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true);
    setContactsError('');
    try {
      const res = await api.get('/contacts/');
      setContacts(res.data || []); // Ensure contacts is always an array
    } catch (err) {
      setContactsError('Failed to load contacts');
      console.error('Failed to load contacts:', err);
      setContacts([]); // Set to empty array on error
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return { contacts, loadingContacts, contactsError, fetchContacts };
}