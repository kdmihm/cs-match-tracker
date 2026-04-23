import { arrayRemove, arrayUnion, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useMemo, useState } from "react";
import { db } from "../firebase";
import { useAuth } from "./useAuth";

export function useFavorites() {
  const { currentUser, userProfile, loading } = useAuth();
  const [updatingTeamId, setUpdatingTeamId] = useState(null);

  const favoriteTeamIds = useMemo(() => userProfile?.favoriteTeamIds || [], [userProfile]);

  async function addFavorite(teamId) {
    if (!currentUser || !teamId) return;

    setUpdatingTeamId(teamId);
    await updateDoc(doc(db, "users", currentUser.uid), {
      favoriteTeamIds: arrayUnion(teamId),
      updatedAt: serverTimestamp(),
    });
    setUpdatingTeamId(null);
  }

  async function removeFavorite(teamId) {
    if (!currentUser || !teamId) return;

    setUpdatingTeamId(teamId);
    await updateDoc(doc(db, "users", currentUser.uid), {
      favoriteTeamIds: arrayRemove(teamId),
      updatedAt: serverTimestamp(),
    });
    setUpdatingTeamId(null);
  }

  async function toggleFavorite(teamId) {
    if (favoriteTeamIds.includes(teamId)) {
      await removeFavorite(teamId);
      return;
    }

    await addFavorite(teamId);
  }

  return {
    favoriteTeamIds,
    isFavorite: (teamId) => favoriteTeamIds.includes(teamId),
    toggleFavorite,
    addFavorite,
    removeFavorite,
    updatingTeamId,
    isAuthenticated: Boolean(currentUser),
    loading,
  };
}
