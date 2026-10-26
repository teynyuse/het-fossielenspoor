import { useEffect, useRef, useState } from "react";
import type { Fossil } from "../types/fossil";
import { DEFAULT_APP_SETTINGS, type AppSettings } from "../types/settings";
import { getAppSettings } from "../api/appSettingsApi";
import {
  getCurrentScan,
  getFossils,
  sendCompleteSignal,
  sendResetSignal,
} from "../api/fossilApi";
import {
  IDLE_RESET_TIME,
  RESET_UID,
  SCAN_POLL_INTERVAL,
  TOTAL_FOSSILS_TO_COMPLETE,
} from "../utils/scanConstants";
import { normaliseUid } from "../utils/rfid";

type CurrentScan = {
  uid: string;
  time: number;
};

const AUDIO_OFF_FINAL_HOLD_TIME = 4500;
const PREVIEW_DIPLOMA_UID = "__PREVIEW_DIPLOMA__";
const PREVIEW_NO_DIPLOMA_UID = "__PREVIEW_NO_DIPLOMA__";

function findMatchingFossil(fossils: Fossil[], scannedUid: string) {
  const cleanScannedUid = normaliseUid(scannedUid);

  if (!cleanScannedUid || cleanScannedUid === RESET_UID) {
    return null;
  }

  return (
    fossils.find((fossil) => {
      const rfidUids = fossil.rfidUids ?? [];

      return rfidUids.some((rfidUid) => {
        return normaliseUid(rfidUid) === cleanScannedUid;
      });
    }) ?? null
  );
}

export function useScanFlow() {
  const [currentScan, setCurrentScan] = useState<CurrentScan>({
    uid: "",
    time: 0,
  });

  const [allFossils, setAllFossils] = useState<Fossil[]>([]);
  const [currentFossil, setCurrentFossil] = useState<Fossil | null>(null);
  const [foundFossilIds, setFoundFossilIds] = useState<string[]>([]);
  const [appSettings, setAppSettings] =
    useState<AppSettings>(DEFAULT_APP_SETTINGS);

  const completeResetTimeMs =
    Math.max(
      5,
      Math.min(60, Number(appSettings.completionDurationSeconds) || 18),
    ) * 1000;

  const [errorMessage, setErrorMessage] = useState("");
  const [hasScan, setHasScan] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isPreparingComplete, setIsPreparingComplete] = useState(false);

  const lastScanAtRef = useRef<number>(Date.now());
  const lastHandledScanKeyRef = useRef("");
  const hasStartedRef = useRef(false);

  const foundFossilIdsRef = useRef<string[]>([]);
  const isCompleteRef = useRef(false);
  const isPreparingCompleteRef = useRef(false);
  const completeResetTimeMsRef = useRef(completeResetTimeMs);
  const pendingCompleteFossilIdRef = useRef<string | null>(null);

  const completeTimeoutRef = useRef<number | undefined>(undefined);
  const completeHoldTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    foundFossilIdsRef.current = foundFossilIds;
  }, [foundFossilIds]);

  useEffect(() => {
    isCompleteRef.current = isComplete;
  }, [isComplete]);

  useEffect(() => {
    isPreparingCompleteRef.current = isPreparingComplete;
  }, [isPreparingComplete]);

  useEffect(() => {
    completeResetTimeMsRef.current = completeResetTimeMs;
  }, [completeResetTimeMs]);

  function clearCompleteTimers() {
    if (completeTimeoutRef.current) {
      window.clearTimeout(completeTimeoutRef.current);
      completeTimeoutRef.current = undefined;
    }

    if (completeHoldTimeoutRef.current) {
      window.clearTimeout(completeHoldTimeoutRef.current);
      completeHoldTimeoutRef.current = undefined;
    }
  }

  function resetLocalFlow() {
    setCurrentScan({
      uid: "",
      time: 0,
    });

    setCurrentFossil(null);
    setFoundFossilIds([]);
    setHasScan(false);
    setIsComplete(false);
    setIsPreparingComplete(false);
    setErrorMessage("");

    foundFossilIdsRef.current = [];
    isCompleteRef.current = false;
    isPreparingCompleteRef.current = false;
    pendingCompleteFossilIdRef.current = null;
    lastHandledScanKeyRef.current = "";
    lastScanAtRef.current = Date.now();

    clearCompleteTimers();
  }

  function finishCompleteFlow(fossilId: string) {
    if (!isPreparingCompleteRef.current || isCompleteRef.current) {
      return;
    }

    if (pendingCompleteFossilIdRef.current !== fossilId) {
      return;
    }

    clearCompleteTimers();

    setIsComplete(true);
    setIsPreparingComplete(false);

    isCompleteRef.current = true;
    isPreparingCompleteRef.current = false;
    pendingCompleteFossilIdRef.current = null;

    void sendCompleteSignal();

    completeTimeoutRef.current = window.setTimeout(() => {
      resetLocalFlow();
      void sendResetSignal();
    }, completeResetTimeMsRef.current);
  }

  function finishCompleteFlowAfterDelay(fossilId: string) {
    clearCompleteTimers();

    completeHoldTimeoutRef.current = window.setTimeout(() => {
      finishCompleteFlow(fossilId);
    }, AUDIO_OFF_FINAL_HOLD_TIME);
  }

  function handleFinalAudioEnded(fossilId: string) {
    finishCompleteFlow(fossilId);
  }

  function handleFinalAudioFailed(fossilId: string) {
    finishCompleteFlowAfterDelay(fossilId);
  }

  function showCompletionPreview(settings: AppSettings, withDiploma: boolean) {
    clearCompleteTimers();

    setAppSettings({
      ...settings,
      diplomaEnabled: withDiploma,
    });

    setCurrentScan({
      uid: withDiploma ? PREVIEW_DIPLOMA_UID : PREVIEW_NO_DIPLOMA_UID,
      time: Date.now(),
    });

    setCurrentFossil(null);
    setHasScan(true);
    setErrorMessage("");
    setIsPreparingComplete(false);
    setIsComplete(true);

    isPreparingCompleteRef.current = false;
    isCompleteRef.current = true;
    pendingCompleteFossilIdRef.current = null;

    void sendCompleteSignal();

    completeTimeoutRef.current = window.setTimeout(() => {
      resetLocalFlow();
      void sendResetSignal();
    }, completeResetTimeMsRef.current);
  }

  useEffect(() => {
    let isActive = true;
    let intervalId: number | undefined;

    async function resetAtStartup() {
      try {
        const [store, settings] = await Promise.all([
          getFossils(),
          getAppSettings(),
        ]);

        await sendResetSignal();

        if (!isActive) {
          return;
        }

        setAllFossils(store.fossils);
        setAppSettings(settings);
        resetLocalFlow();
        hasStartedRef.current = true;
      } catch {
        if (isActive) {
          setErrorMessage("De scanpagina kon niet gereset worden.");
        }
      }
    }

    async function refreshScan() {
      if (
        !hasStartedRef.current ||
        isCompleteRef.current ||
        isPreparingCompleteRef.current
      ) {
        return;
      }

      try {
        const [store, scan, settings] = await Promise.all([
          getFossils(),
          getCurrentScan(),
          getAppSettings(),
        ]);

        if (!isActive) {
          return;
        }

        setAllFossils(store.fossils);
        setAppSettings(settings);

        const scannedUid = normaliseUid(scan.uid);
        const scanKey = `${scannedUid}:${scan.time}`;

        if (scanKey === lastHandledScanKeyRef.current) {
          return;
        }

        lastHandledScanKeyRef.current = scanKey;

        if (
          scannedUid === PREVIEW_DIPLOMA_UID ||
          scannedUid === PREVIEW_NO_DIPLOMA_UID
        ) {
          showCompletionPreview(settings, scannedUid === PREVIEW_DIPLOMA_UID);
          return;
        }

        if (!scannedUid || scannedUid === RESET_UID) {
          setCurrentScan({
            uid: "",
            time: 0,
          });

          setCurrentFossil(null);
          setHasScan(false);
          setErrorMessage("");
          return;
        }

        const matchingFossil = findMatchingFossil(store.fossils, scannedUid);

        lastScanAtRef.current = Date.now();
        setCurrentScan(scan);
        setCurrentFossil(matchingFossil);
        setHasScan(true);
        setErrorMessage("");

        if (!matchingFossil) {
          return;
        }

        const nextFoundIds = foundFossilIdsRef.current.includes(
          matchingFossil.id,
        )
          ? foundFossilIdsRef.current
          : [...foundFossilIdsRef.current, matchingFossil.id];

        foundFossilIdsRef.current = nextFoundIds;
        setFoundFossilIds(nextFoundIds);

        if (nextFoundIds.length >= TOTAL_FOSSILS_TO_COMPLETE) {
          setIsPreparingComplete(true);
          isPreparingCompleteRef.current = true;
          pendingCompleteFossilIdRef.current = matchingFossil.id;

          if (!settings.audioEnabled || !matchingFossil.audioPath) {
            finishCompleteFlowAfterDelay(matchingFossil.id);
          }
        }
      } catch {
        if (isActive) {
          setErrorMessage("De fossielinformatie kon niet geladen worden.");
        }
      }
    }

    void resetAtStartup().then(() => {
      if (!isActive) {
        return;
      }

      intervalId = window.setInterval(() => {
        void refreshScan();
      }, SCAN_POLL_INTERVAL);
    });

    return () => {
      isActive = false;

      if (intervalId) {
        window.clearInterval(intervalId);
      }

      clearCompleteTimers();
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (!hasScan || isComplete || isPreparingComplete) {
        return;
      }

      const now = Date.now();
      const timeSinceLastScan = now - lastScanAtRef.current;

      if (timeSinceLastScan < IDLE_RESET_TIME) {
        return;
      }

      resetLocalFlow();
      void sendResetSignal();
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasScan, isComplete, isPreparingComplete]);

  const foundFossils = allFossils.filter((fossil) =>
    foundFossilIds.includes(fossil.id),
  );

  return {
    currentScan,
    allFossils,
    currentFossil,
    foundFossils,
    foundFossilIds,
    appSettings,
    errorMessage,
    hasScan,
    isComplete,
    isPreparingComplete,
    handleFinalAudioEnded,
    handleFinalAudioFailed,
  };
}
