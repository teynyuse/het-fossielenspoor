import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import type { Fossil } from "../types/fossil";
import type { AppSettings } from "../types/settings";
import { getAppSettings, saveAppSettings } from "../api/appSettingsApi";

type FossilsStore = {
  fossils: Fossil[];
};

type CurrentScan = {
  uid: string;
  time: number;
};

export type PendingImageFiles = Record<string, Record<number, File>>;
export type PendingImagePreviews = Record<string, Record<number, string>>;
export type PendingAudioFiles = Record<string, File>;

export type FossilTextField =
  | "name"
  | "period"
  | "age"
  | "shortDescription"
  | "audioScript";

const EMPTY_FOSSIL: Fossil = {
  id: "",
  name: "",
  period: "",
  age: "",
  shortDescription: "",
  imagePaths: [],
  rfidUids: [],
  ledNumber: 1,
  audioPath: "",
  audioScript: "",
};

export const IMAGE_SLOT_COUNT = 3;

export function normaliseUid(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9_]/g, "");
}

export function getImageSlot(imagePath: string) {
  const match = imagePath.match(/_(1|2|3)\.[a-z0-9]+$/i);
  return match ? Number(match[1]) : 0;
}

export function getImageForSlot(imagePaths: string[], slot: number) {
  return (
    imagePaths.find((imagePath) => {
      return getImageSlot(imagePath) === slot;
    }) ?? ""
  );
}

export function replaceImageSlot(
  imagePaths: string[],
  slot: number,
  nextPath: string,
) {
  const withoutSlot = imagePaths.filter((imagePath) => {
    return getImageSlot(imagePath) !== slot;
  });

  return [...withoutSlot, nextPath].sort((a, b) => {
    const aSlot = getImageSlot(a) || 99;
    const bSlot = getImageSlot(b) || 99;

    return aSlot - bSlot;
  });
}

export function removeImageSlot(imagePaths: string[], slot: number) {
  return imagePaths.filter((imagePath) => {
    return getImageSlot(imagePath) !== slot;
  });
}

export function slugPreview(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "fossiel"
  );
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Data kon niet geladen worden.");
  }

  return response.json() as Promise<T>;
}

async function loadFossils(): Promise<Fossil[]> {
  const store = await getJson<FossilsStore>("/api/fossils");
  return store.fossils;
}

async function getCurrentScan(): Promise<CurrentScan> {
  const scan = await getJson<CurrentScan>("/api/current-scan");

  return {
    uid: normaliseUid(scan.uid ?? ""),
    time: Number(scan.time) || 0,
  };
}

async function saveFossils(fossils: Fossil[]) {
  const response = await fetch("/api/fossils", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fossils,
    }),
  });

  if (!response.ok) {
    throw new Error("Fossielen konden niet opgeslagen worden.");
  }

  return response.json() as Promise<FossilsStore>;
}

async function resetCurrentScan() {
  await fetch("/api/current-scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uid: "__RESET__",
    }),
  });
}

async function uploadFile(
  url: string,
  file: File,
  fossilName: string,
  sequence: number,
) {
  const formData = new FormData();

  formData.append("fossilName", fossilName);
  formData.append("sequence", String(sequence));
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload mislukt.");
  }

  return response.json() as Promise<{ path: string }>;
}

async function deleteMediaFiles(paths: string[]) {
  if (paths.length === 0) {
    return;
  }

  const response = await fetch("/api/media/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paths,
    }),
  });

  if (!response.ok) {
    throw new Error("Media verwijderen mislukt.");
  }
}

function ensureFossilShape(fossil: Partial<Fossil>, index: number): Fossil {
  return {
    ...EMPTY_FOSSIL,
    ...fossil,
    id: fossil.id || `fossil-${index + 1}`,
    name: fossil.name || `Fossiel ${index + 1}`,
    imagePaths: Array.isArray(fossil.imagePaths) ? fossil.imagePaths : [],
    rfidUids: Array.isArray(fossil.rfidUids) ? fossil.rfidUids : [],
    ledNumber:
      typeof fossil.ledNumber === "number" ? fossil.ledNumber : index + 1,
  };
}

export function useAdminManager() {
  const [fossils, setFossils] = useState<Fossil[]>([]);
  const [savedFossils, setSavedFossils] = useState<Fossil[]>([]);
  const [selectedFossilId, setSelectedFossilId] = useState("");

  const [appSettings, setAppSettings] = useState<AppSettings>({
    diplomaEnabled: true,
    audioEnabled: true,
    completionDurationSeconds: 18,

    diplomaTitle: "Je fossielendiploma ligt klaar.",
    diplomaDescription:
      "Ga met je begeleider naar de kassa. Daar krijg je een diploma omdat je alle fossielen hebt ontdekt.",
    diplomaAudioPath: "",

    noDiplomaTitle: "Je hebt alle fossielen ontdekt.",
    noDiplomaDescription:
      "Goed gedaan. Je hebt alle fossielen van het Fossielenspoor gevonden.",
    noDiplomaAudioPath: "",
  });

  const [savedAppSettings, setSavedAppSettings] = useState<AppSettings>({
    diplomaEnabled: true,
    audioEnabled: true,
    completionDurationSeconds: 18,

    diplomaTitle: "Je fossielendiploma ligt klaar.",
    diplomaDescription:
      "Ga met je begeleider naar de kassa. Daar krijg je een diploma omdat je alle fossielen hebt ontdekt.",
    diplomaAudioPath: "",

    noDiplomaTitle: "Je hebt alle fossielen ontdekt.",
    noDiplomaDescription:
      "Goed gedaan. Je hebt alle fossielen van het Fossielenspoor gevonden.",
    noDiplomaAudioPath: "",
  });

  const [pendingImageFiles, setPendingImageFiles] =
    useState<PendingImageFiles>({});

  const [pendingImagePreviews, setPendingImagePreviews] =
    useState<PendingImagePreviews>({});

  const [pendingAudioFiles, setPendingAudioFiles] =
    useState<PendingAudioFiles>({});

  const [deletedMediaPaths, setDeletedMediaPaths] = useState<string[]>([]);

  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [newRfidUid, setNewRfidUid] = useState("");
  const [lastScanUid, setLastScanUid] = useState("");
  const [cacheBuster, setCacheBuster] = useState(Date.now());

  const selectedFossil = useMemo(() => {
    return fossils.find((fossil) => fossil.id === selectedFossilId) ?? null;
  }, [fossils, selectedFossilId]);

  useEffect(() => {
    async function loadData() {
      try {
        const [loadedFossils, loadedSettings] = await Promise.all([
          loadFossils(),
          getAppSettings(),
        ]);

        const shapedFossils = loadedFossils.map(ensureFossilShape);

        setFossils(shapedFossils);
        setSavedFossils(shapedFossils);
        setAppSettings(loadedSettings);
        setSavedAppSettings(loadedSettings);
        setSelectedFossilId(shapedFossils[0]?.id ?? "");
        setHasUnsavedChanges(false);
      } catch {
        setMessage("Admin data kon niet geladen worden.");
      }
    }

    void loadData();
  }, []);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    async function refreshLastScan() {
      try {
        const scan = await getCurrentScan();

        if (
          scan.uid &&
          scan.uid !== "__RESET__" &&
          scan.uid !== "__COMPLETE__"
        ) {
          setLastScanUid(scan.uid);
        }
      } catch {
        // Niet constant foutmelding tonen.
      }
    }

    void refreshLastScan();

    const intervalId = window.setInterval(() => {
      void refreshLastScan();
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  function markUnsaved(messageText?: string) {
    setHasUnsavedChanges(true);

    if (messageText) {
      setMessage(messageText);
    }
  }

  function clearPendingChanges() {
    setPendingImageFiles({});
    setPendingImagePreviews({});
    setPendingAudioFiles({});
    setDeletedMediaPaths([]);
    setHasUnsavedChanges(false);
  }

  function discardChanges() {
    setFossils(savedFossils);
    setAppSettings(savedAppSettings);
    clearPendingChanges();
    setMessage("Wijzigingen geannuleerd.");
  }

  function confirmLoseChanges() {
    if (!hasUnsavedChanges) {
      return true;
    }

    const confirmed = window.confirm(
      "Je hebt niet-opgeslagen wijzigingen. Wil je doorgaan zonder op te slaan?",
    );

    if (confirmed) {
      discardChanges();
    }

    return confirmed;
  }

  function updateSelectedFossil(updates: Partial<Fossil>) {
    if (!selectedFossil) {
      return;
    }

    setFossils((currentFossils) =>
      currentFossils.map((fossil) => {
        if (fossil.id !== selectedFossil.id) {
          return fossil;
        }

        return {
          ...fossil,
          ...updates,
        };
      }),
    );

    markUnsaved();
  }

  function handleSelectFossil(fossilId: string) {
    if (fossilId === selectedFossilId) {
      return;
    }

    if (!confirmLoseChanges()) {
      return;
    }

    setSelectedFossilId(fossilId);
    setMessage("");
  }

  function handleTextChange(field: FossilTextField, value: string) {
    updateSelectedFossil({
      [field]: value,
    });
  }

  function handleLedChange(value: string) {
    if (!selectedFossil) {
      return;
    }

    const oldLedNumber = selectedFossil.ledNumber ?? 1;
    const nextLedNumber = Math.max(1, Math.min(8, Number(value) || 1));

    if (oldLedNumber === nextLedNumber) {
      return;
    }

    setFossils((currentFossils) =>
      currentFossils.map((fossil) => {
        if (fossil.id === selectedFossil.id) {
          return {
            ...fossil,
            ledNumber: nextLedNumber,
          };
        }

        if (fossil.ledNumber === nextLedNumber) {
          return {
            ...fossil,
            ledNumber: oldLedNumber,
          };
        }

        return fossil;
      }),
    );

    markUnsaved(
      `LED ${oldLedNumber} en LED ${nextLedNumber} zijn gewisseld. Klik op Opslaan om dit definitief te maken.`,
    );
  }

  function addRfidToSelectedFossil(uidValue: string) {
    if (!selectedFossil) {
      return;
    }

    const cleanUid = normaliseUid(uidValue);

    if (!cleanUid || cleanUid === "__RESET__" || cleanUid === "__COMPLETE__") {
      setMessage("Geen geldige RFID gevonden.");
      return;
    }

    const uidAlreadyUsed = fossils.some((fossil) => {
      if (fossil.id === selectedFossil.id) {
        return false;
      }

      return fossil.rfidUids.some((rfidUid) => normaliseUid(rfidUid) === cleanUid);
    });

    if (uidAlreadyUsed) {
      setMessage("Deze RFID is al gekoppeld aan een ander fossiel.");
      return;
    }

    updateSelectedFossil({
      rfidUids: [cleanUid],
    });

    setNewRfidUid("");
    markUnsaved(`RFID ingesteld op ${cleanUid}. Klik op Opslaan.`);
  }

  function handleAddRfidUid() {
    addRfidToSelectedFossil(newRfidUid);
  }

  function handleAddLastScanAsRfid() {
    addRfidToSelectedFossil(lastScanUid);
  }

  function handleRemoveRfidUid(uidToRemove: string) {
    if (!selectedFossil) {
      return;
    }

    updateSelectedFossil({
      rfidUids: selectedFossil.rfidUids.filter((uid) => uid !== uidToRemove),
    });

    markUnsaved("RFID verwijderd. Klik op Opslaan.");
  }

  function handleChooseImageSlot(
    event: ChangeEvent<HTMLInputElement>,
    slot: number,
  ) {
    if (!selectedFossil) {
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const oldPath = getImageForSlot(selectedFossil.imagePaths, slot);
    const previewUrl = URL.createObjectURL(file);

    setPendingImageFiles((current) => ({
      ...current,
      [selectedFossil.id]: {
        ...(current[selectedFossil.id] ?? {}),
        [slot]: file,
      },
    }));

    setPendingImagePreviews((current) => ({
      ...current,
      [selectedFossil.id]: {
        ...(current[selectedFossil.id] ?? {}),
        [slot]: previewUrl,
      },
    }));

    if (oldPath) {
      setDeletedMediaPaths((current) =>
        current.includes(oldPath) ? current : [...current, oldPath],
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";

    updateSelectedFossil({
      imagePaths: replaceImageSlot(
        selectedFossil.imagePaths,
        slot,
        `/fossiel-images/${slugPreview(selectedFossil.name)}_${slot}.${extension}`,
      ),
    });

    markUnsaved(
      `Afbeelding ${slot} gekozen. Pas bij Opslaan wordt die echt geüpload.`,
    );

    event.target.value = "";
  }

  function handleRemoveImageSlot(slot: number) {
    if (!selectedFossil) {
      return;
    }

    const oldPath = getImageForSlot(selectedFossil.imagePaths, slot);

    if (oldPath) {
      setDeletedMediaPaths((current) =>
        current.includes(oldPath) ? current : [...current, oldPath],
      );
    }

    setPendingImageFiles((current) => {
      const nextForFossil = {
        ...(current[selectedFossil.id] ?? {}),
      };

      delete nextForFossil[slot];

      return {
        ...current,
        [selectedFossil.id]: nextForFossil,
      };
    });

    setPendingImagePreviews((current) => {
      const nextForFossil = {
        ...(current[selectedFossil.id] ?? {}),
      };

      delete nextForFossil[slot];

      return {
        ...current,
        [selectedFossil.id]: nextForFossil,
      };
    });

    updateSelectedFossil({
      imagePaths: removeImageSlot(selectedFossil.imagePaths, slot),
    });

    markUnsaved(`Afbeelding ${slot} wordt verwijderd bij Opslaan.`);
  }

  function handleChooseAudio(event: ChangeEvent<HTMLInputElement>) {
    if (!selectedFossil) {
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (selectedFossil.audioPath) {
      setDeletedMediaPaths((current) =>
        current.includes(selectedFossil.audioPath ?? "")
          ? current
          : [...current, selectedFossil.audioPath ?? ""],
      );
    }

    setPendingAudioFiles((current) => ({
      ...current,
      [selectedFossil.id]: file,
    }));

    const extension = file.name.split(".").pop()?.toLowerCase() || "mp3";

    updateSelectedFossil({
      audioPath: `/uploads/audio/${slugPreview(
        selectedFossil.name,
      )}_audio.${extension}`,
    });

    markUnsaved("Audio gekozen. Pas bij Opslaan wordt die echt geüpload.");

    event.target.value = "";
  }

  function handleAppSettingChange<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) {
    setAppSettings((current) => ({
      ...current,
      [key]: value,
    }));

    markUnsaved("Complete scherm instelling aangepast. Klik op Opslaan.");
  }

  function handleToggleDiploma() {
    setAppSettings((current) => ({
      ...current,
      diplomaEnabled: !current.diplomaEnabled,
    }));

    markUnsaved("Diploma instelling aangepast. Klik op Opslaan.");
  }

  async function handleSave() {
    const confirmed = window.confirm(
      "Ben je zeker dat je deze wijzigingen wilt opslaan?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage("Wijzigingen worden opgeslagen...");

      let nextFossils = fossils.map(ensureFossilShape);
      const uploadedPaths: string[] = [];

      for (const fossil of nextFossils) {
        const imageFilesForFossil = pendingImageFiles[fossil.id] ?? {};

        for (const slotText of Object.keys(imageFilesForFossil)) {
          const slot = Number(slotText);
          const file = imageFilesForFossil[slot];

          const result = await uploadFile(
            "/api/upload/image",
            file,
            fossil.name,
            slot,
          );

          uploadedPaths.push(result.path);

          nextFossils = nextFossils.map((currentFossil) => {
            if (currentFossil.id !== fossil.id) {
              return currentFossil;
            }

            return {
              ...currentFossil,
              imagePaths: replaceImageSlot(
                currentFossil.imagePaths,
                slot,
                result.path,
              ),
            };
          });
        }

        const audioFile = pendingAudioFiles[fossil.id];

        if (audioFile) {
          const result = await uploadFile(
            "/api/upload/audio",
            audioFile,
            fossil.name,
            1,
          );

          uploadedPaths.push(result.path);

          nextFossils = nextFossils.map((currentFossil) => {
            if (currentFossil.id !== fossil.id) {
              return currentFossil;
            }

            return {
              ...currentFossil,
              audioPath: result.path,
            };
          });
        }
      }

      const finalMediaPaths = nextFossils.flatMap((fossil) => [
        ...(fossil.imagePaths ?? []),
        fossil.audioPath ?? "",
      ]);

      const pathsToDelete = deletedMediaPaths.filter((mediaPath) => {
        if (!mediaPath) {
          return false;
        }

        if (uploadedPaths.includes(mediaPath)) {
          return false;
        }

        if (finalMediaPaths.includes(mediaPath)) {
          return false;
        }

        return true;
      });

      await deleteMediaFiles(pathsToDelete);
      await saveAppSettings(appSettings);
      await saveFossils(nextFossils);

      setFossils(nextFossils);
      setSavedFossils(nextFossils);
      setSavedAppSettings(appSettings);
      clearPendingChanges();
      setCacheBuster(Date.now());
      setMessage("Alles opgeslagen.");
    } catch {
      setMessage("Opslaan is mislukt. Controleer server/logs.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetFlow() {
    if (!confirmLoseChanges()) {
      return;
    }

    const confirmed = window.confirm(
      "Ben je zeker dat je de volledige scanflow wilt resetten?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await resetCurrentScan();
      setMessage("Scanflow gereset.");
    } catch {
      setMessage("Scanflow kon niet gereset worden.");
    }
  }

  function handleOpenScanPage() {
    if (!confirmLoseChanges()) {
      return;
    }

    window.location.href = "/";
  }

  return {
    fossils,
    selectedFossil,
    selectedFossilId,
    appSettings,
    pendingImagePreviews,
    pendingAudioFiles,
    message,
    isSaving,
    hasUnsavedChanges,
    newRfidUid,
    lastScanUid,
    cacheBuster,
    setNewRfidUid,
    handleSelectFossil,
    handleTextChange,
    handleLedChange,
    handleAddRfidUid,
    handleAddLastScanAsRfid,
    handleRemoveRfidUid,
    handleChooseImageSlot,
    handleRemoveImageSlot,
    handleChooseAudio,
    handleAppSettingChange,
    handleToggleDiploma,
    handleSave,
    handleResetFlow,
    handleOpenScanPage,
  };
}
