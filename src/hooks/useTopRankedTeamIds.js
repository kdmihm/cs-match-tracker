import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";

export function useTopRankedTeamIds() {
  const [topRankedTeamIds, setTopRankedTeamIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    return onSnapshot(
      query(collection(db, "teams"), where("isTop50Team", "==", true)),
      (snapshot) => {
        setTopRankedTeamIds(new Set(snapshot.docs.map((docSnapshot) => docSnapshot.id)));
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      },
    );
  }, []);

  return { topRankedTeamIds, loading, error };
}
