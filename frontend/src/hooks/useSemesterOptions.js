import { useEffect, useState, useCallback } from 'react';
import http from '../services/http';

// Unified hook to fetch semester options from backend
// - Caches in sessionStorage to avoid repeated calls per session
// - Returns { options, currentSemester, loading, error, refresh }
export default function useSemesterOptions() {
  const [options, setOptions] = useState([]);
  const [currentSemester, setCurrentSemester] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const cached = sessionStorage.getItem('semester_options');
      if (cached) {
        const parsed = JSON.parse(cached);
        setOptions(Array.isArray(parsed) ? parsed : []);
        setLoading(false);
        // Also refresh in background
        try {
          const res = await http.get('/semesters/options');
          const fresh = res.data?.data || [];
          sessionStorage.setItem('semester_options', JSON.stringify(fresh));
          setOptions(fresh);
        } catch (_) {}
        // Load current semester
        try {
          const currentRes = await http.get('/semesters/current');
          const current = currentRes.data?.data;
          if (current) {
            setCurrentSemester(current.value);
            sessionStorage.setItem('current_semester', current.value);
          }
        } catch (_) {}
        return;
      }
      const res = await http.get('/semesters/options');
      const next = res.data?.data || [];
      sessionStorage.setItem('semester_options', JSON.stringify(next));
      setOptions(next);
      
      // Load current semester
      try {
        const currentRes = await http.get('/semesters/current');
        const current = currentRes.data?.data;
        if (current) {
          setCurrentSemester(current.value);
          sessionStorage.setItem('current_semester', current.value);
        }
      } catch (_) {}
    } catch (e) {
      setError(e?.response?.data?.message || 'Không thể tải danh sách học kỳ');
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Listen for cross-tab invalidation via localStorage event
    const onStorage = (e) => {
      if (e.key === 'semester_options_invalidate' && e.newValue) {
        try { sessionStorage.removeItem('semester_options'); } catch(_) {}
        try { sessionStorage.removeItem('current_semester'); } catch(_) {}
        load();
      }
    };
    // Listen for same-tab invalidation via custom event
    const onBust = () => {
      try { sessionStorage.removeItem('semester_options'); } catch(_) {}
      try { sessionStorage.removeItem('current_semester'); } catch(_) {}
      load();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('semester_options_bust', onBust);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('semester_options_bust', onBust);
    };
  }, [load]);

  return { options, currentSemester, loading, error, refresh: load };
}

// Helper to signal all tabs/pages to refresh semester options cache
export function invalidateSemesterOptionsCache() {
  try { sessionStorage.removeItem('semester_options'); } catch(_) {}
  try { localStorage.setItem('semester_options_invalidate', String(Date.now())); } catch(_) {}
  try { window.dispatchEvent(new Event('semester_options_bust')); } catch(_) {}
}
