import { useCallback, useEffect, useMemo, useState } from 'react';
import stampsData from '../data/stamps.json';
import type { AppSettings, ChatMessage, PersistedState, Stamp, StampStatus } from '../types';
import { tokyoToday, nextStreak } from '../lib/dates';
import { isStampVisible, sumAvoided, sumRealized } from '../lib/money';
import { mergeStamps } from '../lib/editorStorage';
import { useEditorState } from './useEditorState';

const STORAGE_KEY = 'marriage-guide-hiroshima-v2';
const LEGACY_KEY = 'marriage-guide-hiroshima-v1';
const defaultSettings: AppSettings = { hasChild: false, buyingHome: false };

const VALID_STATUS = new Set<StampStatus>(['todo', 'checked', 'done', 'unknown', 'na']);

function normalizeStatus(v: unknown): StampStatus {
  if (typeof v === 'string' && VALID_STATUS.has(v as StampStatus)) return v as StampStatus;
  return 'todo';
}

function emptyState(): PersistedState {
  return {
    settings: defaultSettings,
    statuses: {},
    notes: {},
    chats: {},
    customIn: {},
    streak: 0,
    lastVisitDate: null,
  };
}

function migrateNotesIntoChats(
  notes: Record<string, string>,
  chats: Record<string, ChatMessage[]>,
): Record<string, ChatMessage[]> {
  const next = { ...chats };
  for (const [id, text] of Object.entries(notes)) {
    if (!text?.trim()) continue;
    const existing = next[id] || [];
    const already = existing.some((m) => m.role === 'user' && m.text === text);
    if (already) continue;
    if (existing.length === 0) {
      next[id] = [
        {
          role: 'user',
          text,
          at: new Date(0).toISOString(),
        },
      ];
    }
  }
  return next;
}

function migrateFromPartial(
  parsed: Partial<PersistedState> & { statuses?: Record<string, string> },
): PersistedState {
  const statuses: Record<string, StampStatus> = {};
  for (const [id, st] of Object.entries(parsed.statuses || {})) {
    statuses[id] = normalizeStatus(st);
  }
  const notes =
    parsed.notes && typeof parsed.notes === 'object' ? { ...parsed.notes } : {};
  const chatsRaw =
    parsed.chats && typeof parsed.chats === 'object'
      ? (parsed.chats as Record<string, ChatMessage[]>)
      : {};
  const chats = migrateNotesIntoChats(notes, chatsRaw);
  return {
    settings: { ...defaultSettings, ...(parsed.settings || {}) },
    statuses,
    notes,
    chats,
    customIn: parsed.customIn || {},
    streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
    lastVisitDate: parsed.lastVisitDate ?? null,
  };
}

function load(): PersistedState {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      return migrateFromPartial(JSON.parse(rawV2) as Partial<PersistedState>);
    }
    const rawV1 = localStorage.getItem(LEGACY_KEY);
    if (rawV1) {
      const migrated = migrateFromPartial(JSON.parse(rawV1) as Partial<PersistedState>);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return emptyState();
  } catch {
    return emptyState();
  }
}

export function useAppState() {
  const seedStamps = stampsData as Stamp[];
  const editorApi = useEditorState(seedStamps);

  const [state, setState] = useState<PersistedState>(() => {
    const loaded = load();
    const today = tokyoToday();
    const next = nextStreak(loaded.streak, loaded.lastVisitDate, today);
    return { ...loaded, ...next };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const allStamps = useMemo(
    () => mergeStamps(seedStamps, editorApi.editor),
    [seedStamps, editorApi.editor],
  );

  const visible = useMemo(
    () => allStamps.filter((s) => isStampVisible(s, state.settings)),
    [allStamps, state.settings],
  );

  const setToggle = useCallback((key: keyof AppSettings, value: boolean) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, [key]: value } }));
  }, []);

  const toggleDone = useCallback((id: string) => {
    setState((prev) => {
      const cur = prev.statuses[id] || 'todo';
      const next: StampStatus = cur === 'done' ? 'todo' : 'done';
      return { ...prev, statuses: { ...prev.statuses, [id]: next } };
    });
  }, []);

  const setStatus = useCallback((id: string, status: StampStatus) => {
    setState((prev) => ({
      ...prev,
      statuses: { ...prev.statuses, [id]: status },
    }));
  }, []);

  const setNote = useCallback((id: string, text: string) => {
    setState((prev) => {
      const notes = { ...prev.notes };
      if (!text.trim()) delete notes[id];
      else notes[id] = text;
      return { ...prev, notes };
    });
  }, []);

  const setChat = useCallback((id: string, messages: ChatMessage[]) => {
    setState((prev) => {
      const chats = { ...prev.chats };
      if (!messages.length) delete chats[id];
      else chats[id] = messages;
      return { ...prev, chats };
    });
  }, []);

  const setCustomIn = useCallback((id: string, yen: number | null) => {
    setState((prev) => {
      const customIn = { ...prev.customIn };
      if (yen == null || Number.isNaN(yen)) delete customIn[id];
      else customIn[id] = yen;
      return { ...prev, customIn };
    });
  }, []);

  const realized = useMemo(
    () => sumRealized(visible, state.statuses, state.customIn),
    [visible, state.statuses, state.customIn],
  );
  const avoided = useMemo(() => sumAvoided(visible, state.statuses), [visible, state.statuses]);
  const doneCount = useMemo(
    () => visible.filter((s) => state.statuses[s.id] === 'done').length,
    [visible, state.statuses],
  );
  const unknownCount = useMemo(
    () => visible.filter((s) => state.statuses[s.id] === 'unknown').length,
    [visible, state.statuses],
  );
  const checkedCount = useMemo(
    () => visible.filter((s) => state.statuses[s.id] === 'checked').length,
    [visible, state.statuses],
  );

  const regsForStamp = useCallback(
    (stampId: string) =>
      editorApi.editor.regs.filter((r) => r.linkedStampIds.includes(stampId)),
    [editorApi.editor.regs],
  );

  return {
    seedStamps,
    allStamps,
    visible,
    settings: state.settings,
    statuses: state.statuses,
    notes: state.notes,
    chats: state.chats,
    customIn: state.customIn,
    streak: state.streak,
    lastVisitDate: state.lastVisitDate,
    setToggle,
    toggleDone,
    setStatus,
    setNote,
    setChat,
    setCustomIn,
    realized,
    avoided,
    doneCount,
    unknownCount,
    checkedCount,
    editor: editorApi,
    regsForStamp,
    homeOverrides: editorApi.editor.homeOverrides,
    customStampSquares: editorApi.editor.customStampSquares,
  };
}

export type AppState = ReturnType<typeof useAppState>;
