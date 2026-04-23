import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { createContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import { ensureUserDocument } from "../services/auth";

export const AuthContext = createContext({
  currentUser: null,
  userProfile: null,
  loading: true,
});

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setUserProfile(null);
      setAuthLoading(false);

      if (user) {
        setProfileLoading(true);
        await ensureUserDocument(user);
      }
    });
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setProfileLoading(false);
      return undefined;
    }

    const userRef = doc(db, "users", currentUser.uid);
    return onSnapshot(
      userRef,
      (snapshot) => {
        setUserProfile(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
        setProfileLoading(false);
      },
      () => setProfileLoading(false),
    );
  }, [currentUser]);

  const value = useMemo(
    () => ({
      currentUser,
      userProfile,
      loading: authLoading || profileLoading,
    }),
    [authLoading, currentUser, profileLoading, userProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
