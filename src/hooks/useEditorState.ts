import { useCallback, useEffect, useState } from 'react';
import type { Stamp } from '../types';
import {
  EDITOR_STORAGE_KEY,
  emptyEditorState,
  loadEditorState,
  makeBlankCustomStamp,
  migrateEditorState,
  nextCustomStampId,
  saveEditorState,
  uid,
  type EditorState,
  type HomeOverrides,
  type RegDoc,
  type StampOverride,
  type WishlistItem,
  type WishlistStatus,
} from '../lib/editorStorage';

export function useEditorState(seedStamps: Stamp[]) {
  const [editor, setEditor] = useState<EditorState>(() => loadEditorState());

  useEffect(() => {
    saveEditorState(editor);
  }, [editor]);

  const setPin = useCallback((pin: string) => {
    setEditor((prev) => ({ ...prev, pin: pin.replace(/\D/g, '').slice(0, 4) }));
  }, []);

  const upsertReg = useCallback((doc: RegDoc) => {
    setEditor((prev) => {
      const i = prev.regs.findIndex((r) => r.id === doc.id);
      const regs = [...prev.regs];
      const next = { ...doc, updatedAt: new Date().toISOString() };
      if (i >= 0) regs[i] = next;
      else regs.unshift(next);
      return { ...prev, regs };
    });
  }, []);

  const deleteReg = useCallback((id: string) => {
    setEditor((prev) => ({ ...prev, regs: prev.regs.filter((r) => r.id !== id) }));
  }, []);

  const setOverride = useCallback((stampId: string, patch: StampOverride) => {
    setEditor((prev) => {
      const cur = prev.contentOverrides[stampId] || {};
      const next = { ...cur, ...patch };
      // Drop empty override object keys that are undefined
      const cleaned: StampOverride = {};
      for (const [k, v] of Object.entries(next)) {
        if (v !== undefined) (cleaned as Record<string, unknown>)[k] = v;
      }
      return {
        ...prev,
        contentOverrides: { ...prev.contentOverrides, [stampId]: cleaned },
      };
    });
  }, []);

  const clearOverride = useCallback((stampId: string) => {
    setEditor((prev) => {
      const contentOverrides = { ...prev.contentOverrides };
      delete contentOverrides[stampId];
      return { ...prev, contentOverrides };
    });
  }, []);

  const softHideStamp = useCallback((stampId: string, hide: boolean) => {
    setEditor((prev) => {
      const set = new Set(prev.hiddenStampIds);
      if (hide) set.add(stampId);
      else set.delete(stampId);
      return { ...prev, hiddenStampIds: [...set] };
    });
  }, []);

  const addCustomStamp = useCallback(
    (squareId?: string) => {
      const id = nextCustomStampId(seedStamps, editor.customStamps);
      const stamp = makeBlankCustomStamp(id);
      setEditor((prev) => ({
        ...prev,
        customStamps: [...prev.customStamps, stamp],
        customStampSquares: squareId
          ? { ...prev.customStampSquares, [id]: squareId }
          : prev.customStampSquares,
      }));
      return id;
    },
    [seedStamps, editor.customStamps],
  );

  const updateCustomStamp = useCallback((stamp: Stamp) => {
    setEditor((prev) => ({
      ...prev,
      customStamps: prev.customStamps.map((s) => (s.id === stamp.id ? stamp : s)),
    }));
  }, []);

  const deleteCustomStamp = useCallback((id: string) => {
    setEditor((prev) => {
      const customStamps = prev.customStamps.filter((s) => s.id !== id);
      const customStampSquares = { ...prev.customStampSquares };
      delete customStampSquares[id];
      const contentOverrides = { ...prev.contentOverrides };
      delete contentOverrides[id];
      return { ...prev, customStamps, customStampSquares, contentOverrides };
    });
  }, []);

  const assignCustomSquare = useCallback((stampId: string, squareId: string) => {
    setEditor((prev) => {
      const customStampSquares = { ...prev.customStampSquares };
      if (!squareId) delete customStampSquares[stampId];
      else customStampSquares[stampId] = squareId;
      return { ...prev, customStampSquares };
    });
  }, []);

  const setHomeOverrides = useCallback((patch: HomeOverrides) => {
    setEditor((prev) => {
      const homeOverrides: HomeOverrides = { ...prev.homeOverrides };
      (['headline', 'anti_lie_banner', 'kicker'] as const).forEach((k) => {
        if (k in patch) {
          const v = patch[k];
          if (v == null || v === '') delete homeOverrides[k];
          else homeOverrides[k] = v;
        }
      });
      return { ...prev, homeOverrides };
    });
  }, []);

  const upsertWish = useCallback((item: WishlistItem) => {
    setEditor((prev) => {
      const i = prev.wishlist.findIndex((w) => w.id === item.id);
      const wishlist = [...prev.wishlist];
      if (i >= 0) wishlist[i] = item;
      else wishlist.unshift(item);
      return { ...prev, wishlist };
    });
  }, []);

  const deleteWish = useCallback((id: string) => {
    setEditor((prev) => ({ ...prev, wishlist: prev.wishlist.filter((w) => w.id !== id) }));
  }, []);

  const setWishStatus = useCallback((id: string, status: WishlistStatus) => {
    setEditor((prev) => ({
      ...prev,
      wishlist: prev.wishlist.map((w) => (w.id === id ? { ...w, status } : w)),
    }));
  }, []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(editor, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marriage-guide-editor-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [editor]);

  const importJson = useCallback((raw: unknown, mode: 'merge' | 'replace') => {
    const incoming = migrateEditorState(raw);
    setEditor((prev) => {
      if (mode === 'replace') return incoming;
      return {
        version: 1,
        regs: [...incoming.regs, ...prev.regs.filter((r) => !incoming.regs.some((x) => x.id === r.id))],
        contentOverrides: { ...prev.contentOverrides, ...incoming.contentOverrides },
        customStamps: [
          ...incoming.customStamps,
          ...prev.customStamps.filter((s) => !incoming.customStamps.some((x) => x.id === s.id)),
        ],
        customStampSquares: { ...prev.customStampSquares, ...incoming.customStampSquares },
        hiddenStampIds: [...new Set([...prev.hiddenStampIds, ...incoming.hiddenStampIds])],
        homeOverrides: { ...prev.homeOverrides, ...incoming.homeOverrides },
        wishlist: [
          ...incoming.wishlist,
          ...prev.wishlist.filter((w) => !incoming.wishlist.some((x) => x.id === w.id)),
        ],
        pin: incoming.pin || prev.pin,
      };
    });
  }, []);

  const resetToSeed = useCallback(() => {
    setEditor(emptyEditorState());
    localStorage.removeItem(EDITOR_STORAGE_KEY);
  }, []);

  const newReg = useCallback(
    (partial?: Partial<RegDoc>): RegDoc => ({
      id: uid('reg'),
      title: partial?.title || '新しい規程',
      side: partial?.side || '共通',
      text: partial?.text || '',
      checklist: partial?.checklist || [],
      linkedStampIds: partial?.linkedStampIds || [],
      updatedAt: new Date().toISOString(),
    }),
    [],
  );

  const newWish = useCallback(
    (): WishlistItem => ({
      id: uid('wish'),
      title: '',
      note: '',
      status: 'idea',
    }),
    [],
  );

  return {
    editor,
    setPin,
    upsertReg,
    deleteReg,
    newReg,
    setOverride,
    clearOverride,
    softHideStamp,
    addCustomStamp,
    updateCustomStamp,
    deleteCustomStamp,
    assignCustomSquare,
    setHomeOverrides,
    upsertWish,
    deleteWish,
    setWishStatus,
    newWish,
    exportJson,
    importJson,
    resetToSeed,
  };
}

export type EditorApi = ReturnType<typeof useEditorState>;
