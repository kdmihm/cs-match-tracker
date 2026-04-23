import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export async function ensureUserDocument(user) {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName || "",
      email: user.email || "",
      favoriteTeamIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await setDoc(
    userRef,
    {
      displayName: user.displayName || snapshot.data().displayName || "",
      email: user.email || snapshot.data().email || "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDocument(credential.user);
  return credential.user;
}

export async function registerWithEmail(email, password, displayName) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }

  await ensureUserDocument({
    uid: credential.user.uid,
    email: credential.user.email,
    displayName: displayName || credential.user.displayName || "",
  });
  return credential.user;
}

export function logout() {
  return signOut(auth);
}
