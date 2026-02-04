import { auth } from "./firebase";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from "firebase/auth";

const provider = new GoogleAuthProvider();

export const signInGoogle = async () => {
  try {
    // Popup est souvent plus stable pour éviter les boucles de redirection sur localhost
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Erreur login:", error);
    alert("Veuillez autoriser les pop-ups pour ce site");
  }
};

export const listenAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
