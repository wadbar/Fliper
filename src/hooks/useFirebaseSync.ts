import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

export function useFirebaseSync() {
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Auth Listener & Local Storage Fallback
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      if (!usr) {
        try {
          const localFavs = JSON.parse(localStorage.getItem('fliper_favorites') || '[]');
          const localStats = JSON.parse(localStorage.getItem('fliper_stats') || '{}');
          setFavorites(new Set(localFavs));
          setStats(localStats);
        } catch (e) {
          setFavorites(new Set());
          setStats({});
        }
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Sync Listeners
  useEffect(() => {
    if (!user) return;

    // Favoritos
    const favsRef = collection(db, 'users', user.uid, 'favorites');
    const unsubscribeFavs = onSnapshot(favsRef, (snapshot) => {
      const favIds = new Set<string>();
      snapshot.forEach((doc) => favIds.add(doc.data().gameId));
      setFavorites(favIds);
    });

    // Stats
    const statsRef = collection(db, 'users', user.uid, 'stats');
    const unsubscribeStats = onSnapshot(statsRef, (snapshot) => {
      const statsMap: Record<string, any> = {};
      snapshot.forEach((doc) => {
        statsMap[doc.id] = doc.data();
      });
      setStats(statsMap);
      setLoading(false);
    });

    return () => {
      unsubscribeFavs();
      unsubscribeStats();
    };
  }, [user]);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const logout = () => signOut(auth);

  const toggleFavorite = async (gameId: string) => {
    if (!user) {
      setFavorites(prev => {
        const next = new Set(prev);
        if (next.has(gameId)) next.delete(gameId);
        else next.add(gameId);
        localStorage.setItem('fliper_favorites', JSON.stringify(Array.from(next)));
        return next;
      });
      return;
    }
    const favRef = doc(db, 'users', user.uid, 'favorites', gameId);
    if (favorites.has(gameId)) {
      await deleteDoc(favRef);
    } else {
      await setDoc(favRef, { gameId, addedAt: serverTimestamp() });
    }
  };

  const recordLaunch = async (gameId: string) => {
    const current = stats[gameId] || { playCount: 0 };
    const playCount = (current.playCount || 0) + 1;
    
    if (!user) {
      const seconds = Math.floor(Date.now() / 1000);
      setStats(prev => {
        const next = {
          ...prev,
          [gameId]: { ...prev[gameId], gameId, playCount, lastPlayed: { seconds } }
        };
        localStorage.setItem('fliper_stats', JSON.stringify(next));
        return next;
      });
      return;
    }

    const statRef = doc(db, 'users', user.uid, 'stats', gameId);
    
    await setDoc(statRef, {
      gameId,
      playCount,
      lastPlayed: serverTimestamp()
    }, { merge: true });
  };

  return { user, favorites, stats, loading, login, logout, toggleFavorite, recordLaunch };
}
