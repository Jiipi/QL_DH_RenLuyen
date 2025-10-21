import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * useSafeNavigate: đảm bảo navigate diễn ra, nếu sau delay không đổi pathname sẽ fallback hard redirect.
 * @param {number} timeout ms chờ trước khi fallback
 */
export default function useSafeNavigate(timeout = 400){
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback((to, opts = {}) => {
    const before = location.pathname;
    console.log('[useSafeNavigate] request ->', to, 'from', before);
    try {
      navigate(to, opts);
    } catch (e) {
      console.warn('[useSafeNavigate] navigate threw, fallback', e);
      window.location.assign(to);
      return;
    }
    const start = Date.now();
    setTimeout(() => {
      const after = window.location.pathname;
      if (after === before) {
        console.warn('[useSafeNavigate] still on', after, 'after', Date.now()-start, 'ms -> hard redirect');
        window.location.assign(to);
      } else {
        console.log('[useSafeNavigate] success path now', after);
      }
    }, timeout);
  }, [navigate, location.pathname]);
}
