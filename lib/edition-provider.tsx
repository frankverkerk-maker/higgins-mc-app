/**
 * EditionProvider — Higgins MC
 *
 * Beheert de actieve "editie" van de app:
 *   - "internal"  → volledige FMC, incl. classified afdelingen (jullie eigen dev-omgeving)
 *   - "whitelab"  → classified afdelingen verborgen voor klanten
 *
 * De keuze wordt opgeslagen in AsyncStorage en hersteld bij app-start.
 * Bedoeld als operator-instelling; klanten krijgen in een uitgeleverde
 * whitelab-build deze schakelaar niet te zien (zie Settings).
 *
 * Gebruik:
 *   const { edition, setEdition, isInternal } = useEdition();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Edition } from "@/constants/team";

export const EDITION_STORAGE_KEY = "higgins_edition";

interface EditionContextValue {
  edition: Edition;
  setEdition: (edition: Edition) => Promise<void>;
  isInternal: boolean;
}

const EditionContext = createContext<EditionContextValue>({
  edition: "internal",
  setEdition: async () => {},
  isInternal: true,
});

export function EditionProvider({ children }: { children: React.ReactNode }) {
  const [edition, setEditionState] = useState<Edition>("internal");

  useEffect(() => {
    AsyncStorage.getItem(EDITION_STORAGE_KEY).then((stored) => {
      if (stored === "internal" || stored === "whitelab") {
        setEditionState(stored);
      }
    });
  }, []);

  const setEdition = useCallback(async (next: Edition) => {
    setEditionState(next);
    await AsyncStorage.setItem(EDITION_STORAGE_KEY, next);
  }, []);

  return (
    <EditionContext.Provider value={{ edition, setEdition, isInternal: edition === "internal" }}>
      {children}
    </EditionContext.Provider>
  );
}

export function useEdition(): EditionContextValue {
  return useContext(EditionContext);
}
