import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast from '../utils/notify';
import { useAuth } from './AuthContext';

const ShiftContext = createContext(null);

export const useShift = () => {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error('useShift must be used within a ShiftProvider');
  return ctx;
};

export const ShiftProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastSummary, setLastSummary] = useState(null);
  const [closeDetails, setCloseDetails] = useState(null);

  const API_BASE = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api`;

  // Seed from localStorage early to avoid flicker/false negatives
  useEffect(() => {
    try {
      const cached = localStorage.getItem('pos_current_session');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.status === 'open') setCurrentSession(parsed);
      }
    } catch (_) {}
  }, []);

  const getBranchId = useCallback(() => {
    try {
      return user?.branchId || localStorage.getItem('pos_branch_id') || null;
    } catch (_) {
      return user?.branchId || null;
    }
  }, [user?.branchId]);

  const refresh = useCallback(async () => {
    const branchId = getBranchId();
    if (!branchId) return;
    try {
      setLoading(true);
      setError('');
      // Fetch current session at BRANCH scope (do not filter by cashier)
      // This avoids the UI showing "No Session" when another cashier opened the register.
      const { data } = await axios.get(`${API_BASE}/pos/sessions/current`, {
        params: { branchId }
      });
      const ses = data.session || null;
      setCurrentSession((prev) => {
        const changed = (!!prev?._id) !== (!!ses?._id) || (prev?._id !== ses?._id) || (prev?.status !== ses?.status);
        if (changed) {
          try { window.dispatchEvent(new CustomEvent('pos:sessionChanged', { detail: { session: ses } })); } catch (_) {}
        }
        return ses;
      });
      try {
        if (ses) localStorage.setItem('pos_current_session', JSON.stringify(ses));
        else localStorage.removeItem('pos_current_session');
      } catch (_) {}
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to load session';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [getBranchId, API_BASE]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Periodic refresh to keep session status in sync and recover from races
  useEffect(() => {
    if (!user?.branchId) return;
    const id = setInterval(() => {
      refresh();
    }, 15000);
    return () => clearInterval(id);
  }, [user?.branchId, refresh]);

  const openSession = async ({ openingFloat = 0, notes = '' } = {}) => {
    const branchId = getBranchId();
    if (!branchId) {
      const msg = 'Branch not found for user. Please ensure your account has a branch assigned.';
      setError(msg);
      toast.error(msg);
      return null;
    }
    try {
      setLoading(true);
    const { data } = await axios.post(`${API_BASE}/pos/sessions/open`, {
        branchId,
        restaurantId: user.restaurantId,
        cashierId: user._id || user.id,
        openingFloat,
        notes
      });
  setCurrentSession(data.session);
  try { localStorage.setItem('pos_current_session', JSON.stringify(data.session)); } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('pos:sessionChanged', { detail: { session: data.session } })); } catch (_) {}
      toast.success('Session opened');
      // Force refresh to avoid any cache/state race
  try { await refresh(); } catch (_) {}
      return data.session;
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to open session';
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const closeSession = async ({ closingCash = 0, expectedCash = 0, totals = {}, notes = '' } = {}) => {
    if (!currentSession?._id) {
      toast.error('No open session');
      return null;
    }
    try {
      setLoading(true);
  const { data } = await axios.post(`${API_BASE}/pos/sessions/${currentSession._id}/close`, {
        closingCash,
        expectedCash,
        totals,
        notes
      });
      setCurrentSession(null);
      if (data?.summary) setLastSummary(data.summary);
  setCloseDetails(null);
  try { localStorage.removeItem('pos_current_session'); } catch (_) {}
      try { window.dispatchEvent(new CustomEvent('pos:sessionChanged', { detail: { session: null, summary: data?.summary } })); } catch (_) {}
      toast.success('Session closed');
      return data.session;
    } catch (e) {
  const msg = e?.response?.data?.message || 'Failed to close session';
      setError(msg);
  setCloseDetails(e?.response?.data?.details || null);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const isOpen = !!(currentSession && currentSession.status !== 'closed');

  const value = useMemo(() => ({ currentSession, isOpen, loading, error, refresh, openSession, closeSession, lastSummary, closeDetails }), [currentSession, isOpen, loading, error, refresh, openSession, closeSession, lastSummary, closeDetails]);

  return (
    <ShiftContext.Provider value={value}>
      {children}
    </ShiftContext.Provider>
  );
};
