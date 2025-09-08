import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

  const refresh = useCallback(async () => {
    if (!user?.branchId) return;
    try {
      setLoading(true);
      setError('');
      const { data } = await axios.get(`${API_BASE}/pos/sessions/current`, {
        params: { branchId: user.branchId, cashierId: user._id || user.id }
      });
      const ses = data.session || null;
      setCurrentSession(ses);
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
  }, [user, API_BASE]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openSession = async ({ openingFloat = 0, notes = '' } = {}) => {
    if (!user?.branchId) {
      toast.error('Branch not found for user');
      return null;
    }
    try {
      setLoading(true);
      const { data } = await axios.post(`${API_BASE}/pos/sessions/open`, {
        branchId: user.branchId,
        restaurantId: user.restaurantId,
        cashierId: user._id || user.id,
        openingFloat,
        notes
      });
  setCurrentSession(data.session);
  try { localStorage.setItem('pos_current_session', JSON.stringify(data.session)); } catch (_) {}
      toast.success('Session opened');
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
  try { localStorage.removeItem('pos_current_session'); } catch (_) {}
      toast.success('Session closed');
      return data.session;
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to close session';
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const isOpen = !!(currentSession && currentSession.status !== 'closed');

  return (
    <ShiftContext.Provider value={{ currentSession, isOpen, loading, error, refresh, openSession, closeSession, lastSummary }}>
      {children}
    </ShiftContext.Provider>
  );
};
