const express = require("express");
const cors = require("cors");
const fs = require("fs/promises");
const path = require("path");

const DEFAULT_APP_SETTINGS = {
  diplomaEnabled: true,
  audioEnabled: true,
  completionDurationSeconds: 18,
  diplomaTitle: "Proficiat!",
  diplomaDescription: "Je hebt alle fossielen gevonden. Je mag je diploma gaan halen.",
  diplomaAudioPath: "",
  noDiplomaTitle: "Alle fossielen gevonden!",
  noDiplomaDescription: "Goed gedaan. Je hebt alle fossielen van het Fossielenspoor gevonden.",
  noDiplomaAudioPath: "",
};

function normaliseAppSettings(settings) {
  return {
    ...DEFAULT_APP_SETTINGS,
    ...(settings || {}),

    diplomaEnabled:
      typeof settings?.diplomaEnabled === "boolean"
        ? settings.diplomaEnabled
        : DEFAULT_APP_SETTINGS.diplomaEnabled,

    audioEnabled:
      typeof settings?.audioEnabled === "boolean"
        ? settings.audioEnabled
        : DEFAULT_APP_SETTINGS.audioEnabled,

    completionDurationSeconds:
      typeof settings?.completionDurationSeconds === "number"
        ? settings.completionDurationSeconds
        : DEFAULT_APP_SETTINGS.completionDurationSeconds,

    diplomaTitle:
      settings?.diplomaTitle || DEFAULT_APP_SETTINGS.diplomaTitle,

    diplomaDescription:
      settings?.diplomaDescription || DEFAULT_APP_SETTINGS.diplomaDescription,

    diplomaAudioPath:
      settings?.diplomaAudioPath || DEFAULT_APP_SETTINGS.diplomaAudioPath,

    noDiplomaTitle:
      settings?.noDiplomaTitle || DEFAULT_APP_SETTINGS.noDiplomaTitle,

    noDiplomaDescription:
      settings?.noDiplomaDescription || DEFAULT_APP_SETTINGS.noDiplomaDescription,

    noDiplomaAudioPath:
      settings?.noDiplomaAudioPath || DEFAULT_APP_SETTINGS.noDiplomaAudioPath,
  };
}

const multer = require("multer");

const app = express();

const PORT = Number(process.env.PORT || 3000);

const rootDirectory = path.resolve(__dirname, "..");
const dataDirectory = path.join(rootDirectory, "data");
const publicDirectory = path.join(rootDirectory, "public");
const distDirectory = path.join(rootDirectory, "dist");

const fossilsFile = path.join(publicDirectory, "data", "fossils.json");
const currentScanFile = path.join(dataDirectory, "current-scan.json");
const settingsFile = path.join(dataDirectory, "settings.json");

const fossilImagesDirectory = path.join(publicDirectory, "fossiel-images");
const uploadsDirectory = path.join(publicDirectory, "uploads");
const audioUploadsDirectory = path.join(uploadsDirectory, "audio");

const RESET_UID = "__RESET__";
const COMPLETE_UID = "__COMPLETE__";

const defaultCurrentScan = {
  uid: RESET_UID,
  time: 0,
};

const defaultSettings = DEFAULT_APP_SETTINGS;

const defaultFossilsStore = {
  fossils: [],
};

app.use(cors());
app.use(express.json({ limit: "25mb" }));

app.use("/fossiel-images", express.static(fossilImagesDirectory));
app.use("/uploads", express.static(uploadsDirectory));
app.use(express.static(publicDirectory));

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, {
    recursive: true,
  });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, fallbackValue) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return fallbackValue;
  }
}

async function writeJson(filePath, data) {
  await ensureDirectory(path.dirname(filePath));

  await fs.writeFile(
    filePath,
    `${JSON.stringify(data, null, 2)}\n`,
    "utf-8",
  );
}

function normaliseUid(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "");
}

function cleanString(value) {
  return String(value ?? "").trim();
}

function cleanStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => cleanString(item)).filter(Boolean);
}

function cleanLedNumber(value, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(1, Math.min(8, Math.round(number)));
}

function cleanFossil(fossil, index) {
  return {
    id: cleanString(fossil?.id) || `fossil-${index + 1}`,
    name: cleanString(fossil?.name) || `Fossiel ${index + 1}`,
    period: cleanString(fossil?.period),
    age: cleanString(fossil?.age),
    shortDescription: cleanString(fossil?.shortDescription),
    audioPath: cleanString(fossil?.audioPath),
    audioScript: cleanString(fossil?.audioScript),
    imagePaths: cleanStringArray(fossil?.imagePaths),
    rfidUids: cleanStringArray(fossil?.rfidUids).map(normaliseUid),
    ledNumber: cleanLedNumber(fossil?.ledNumber, index + 1),
  };
}

function cleanFossilsStore(value) {
  const fossils = Array.isArray(value?.fossils) ? value.fossils : [];

  return {
    fossils: fossils.slice(0, 8).map(cleanFossil),
  };
}

function slugify(value) {
  return String(value || "fossiel")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "fossiel";
}

function safeExtension(originalName, fallbackExtension) {
  const extension = path.extname(originalName || "").toLowerCase();

  if (!extension) {
    return fallbackExtension;
  }

  return extension.replace(/[^a-z0-9.]/g, "");
}

async function deleteExistingImageSlot(fossilName, sequence) {
  const slug = slugify(fossilName);
  const safeSequence = Math.max(1, Math.min(3, Number(sequence) || 1));

  const files = await fs.readdir(fossilImagesDirectory).catch(() => []);

  await Promise.all(
    files
      .filter((fileName) => {
        return new RegExp(`^${slug}_${safeSequence}\\.[a-z0-9]+$`, "i").test(
          fileName,
        );
      })
      .map((fileName) => {
        return fs.rm(path.join(fossilImagesDirectory, fileName), {
          force: true,
        });
      }),
  );
}

function makeUploadFilename(req, file, type) {
  const fossilName = req.body?.fossilName || "fossiel";
  const sequence = Math.max(1, Math.min(3, Number(req.body?.sequence) || 1));
  const slug = slugify(fossilName);

  if (type === "image") {
    const extension = safeExtension(file.originalname, ".jpg");
    return `${slug}_${sequence}${extension}`;
  }

  const extension = safeExtension(file.originalname, ".mp3");
  return `${slug}_audio${extension}`;
}

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        await ensureDirectory(fossilImagesDirectory);
        await deleteExistingImageSlot(req.body?.fossilName, req.body?.sequence);
        cb(null, fossilImagesDirectory);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      cb(null, makeUploadFilename(req, file, "image"));
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }

    cb(new Error("Alleen afbeeldingen zijn toegestaan."));
  },
});

const audioUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        await ensureDirectory(audioUploadsDirectory);
        cb(null, audioUploadsDirectory);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      cb(null, makeUploadFilename(req, file, "audio"));
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
      return;
    }

    cb(new Error("Alleen audio is toegestaan."));
  },
});

function safePublicFilePath(publicPath) {
  const cleanPath = cleanString(publicPath);

  if (!cleanPath.startsWith("/")) {
    return null;
  }

  const resolvedPath = path.resolve(publicDirectory, `.${cleanPath}`);

  const allowedRoots = [
    path.resolve(fossilImagesDirectory),
    path.resolve(audioUploadsDirectory),
  ];

  const isAllowed = allowedRoots.some((allowedRoot) => {
    return (
      resolvedPath === allowedRoot ||
      resolvedPath.startsWith(`${allowedRoot}${path.sep}`)
    );
  });

  if (!isAllowed) {
    return null;
  }

  return resolvedPath;
}

async function initialiseFiles() {
  await ensureDirectory(dataDirectory);
  await ensureDirectory(path.dirname(fossilsFile));
  await ensureDirectory(fossilImagesDirectory);
  await ensureDirectory(audioUploadsDirectory);

  if (!(await fileExists(fossilsFile))) {
    await writeJson(fossilsFile, defaultFossilsStore);
  }

  if (!(await fileExists(settingsFile))) {
    await writeJson(settingsFile, defaultSettings);
  }

  await writeJson(currentScanFile, {
    uid: RESET_UID,
    time: Date.now(),
  });

  console.log("Current scan gereset bij opstart.");
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Fossielenspoor server",
  });
});

app.get("/api/fossils", async (req, res) => {
  try {
    const store = await readJson(fossilsFile, defaultFossilsStore);
    res.json(cleanFossilsStore(store));
  } catch (error) {
    console.error("Fossielen konden niet geladen worden:", error);

    res.status(500).json({
      error: "Fossielen konden niet geladen worden.",
    });
  }
});

app.put("/api/fossils", async (req, res) => {
  try {
    const store = cleanFossilsStore(req.body);

    await writeJson(fossilsFile, store);

    res.json(store);
  } catch (error) {
    console.error("Fossielen konden niet opgeslagen worden:", error);

    res.status(500).json({
      error: "Fossielen konden niet opgeslagen worden.",
    });
  }
});

app.get("/api/current-scan", async (req, res) => {
  try {
    const currentScan = await readJson(currentScanFile, defaultCurrentScan);

    res.json({
      uid: normaliseUid(currentScan.uid),
      time: Number(currentScan.time) || 0,
    });
  } catch (error) {
    console.error("Current scan kon niet gelezen worden:", error);

    res.status(500).json({
      error: "Current scan kon niet gelezen worden.",
    });
  }
});

app.post("/api/current-scan", async (req, res) => {
  try {
    const incomingUid = normaliseUid(req.body?.uid);

    if (!incomingUid) {
      return res.status(400).json({
        error: "Geen geldige RFID UID ontvangen.",
      });
    }

    const currentScan = await readJson(currentScanFile, defaultCurrentScan);
    const currentUid = normaliseUid(currentScan?.uid);

    const isResetSignal = incomingUid === RESET_UID;
    const isCompleteSignal = incomingUid === COMPLETE_UID;
    const isCurrentlyComplete = currentUid === COMPLETE_UID;

    if (isCurrentlyComplete && !isResetSignal) {
      return res.json({
        ignored: true,
        locked: true,
        uid: currentUid,
        message: "Scan genegeerd omdat het diploma scherm actief is.",
      });
    }

    const nextScan = {
      uid: incomingUid,
      time: Date.now(),
    };

    await writeJson(currentScanFile, nextScan);

    res.json({
      ok: true,
      uid: nextScan.uid,
      time: nextScan.time,
      complete: isCompleteSignal,
      reset: isResetSignal,
    });
  } catch (error) {
    console.error("Current scan kon niet opgeslagen worden:", error);

    res.status(500).json({
      error: "Current scan kon niet opgeslagen worden.",
    });
  }
});


app.post("/api/preview-completion", async (req, res) => {
  try {
    const mode = String(req.body?.mode || "");
    const uid =
      mode === "no-diploma"
        ? "__PREVIEW_NO_DIPLOMA__"
        : "__PREVIEW_DIPLOMA__";

    const nextScan = {
      uid,
      time: Date.now(),
    };

    await writeJson(currentScanFile, nextScan);

    res.json({
      ok: true,
      mode,
      uid,
      time: nextScan.time,
    });
  } catch (error) {
    console.error("Preview completion kon niet gestart worden:", error);

    res.status(500).json({
      error: "Preview completion kon niet gestart worden.",
    });
  }
});

app.get("/api/settings", async (req, res) => {
  try {
    const settings = await readJson(settingsFile, DEFAULT_APP_SETTINGS);
    res.json(normaliseAppSettings(settings));
  } catch (error) {
    console.error("Settings konden niet gelezen worden:", error);
    res.status(500).json({ error: "Settings konden niet gelezen worden." });
  }
});

app.put("/api/settings", async (req, res) => {
  try {
    const currentSettings = await readJson(settingsFile, DEFAULT_APP_SETTINGS);
    const nextSettings = normaliseAppSettings({
      ...currentSettings,
      ...req.body,
    });

    await writeJson(settingsFile, nextSettings);

    res.json(nextSettings);
  } catch (error) {
    console.error("Settings konden niet opgeslagen worden:", error);
    res.status(500).json({ error: "Settings konden niet opgeslagen worden." });
  }
});

app.post("/api/upload/image", imageUpload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "Geen afbeelding ontvangen.",
    });
  }

  res.json({
    path: `/fossiel-images/${req.file.filename}`,
  });
});



app.post("/api/upload/completion-audio", audioUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Geen audio ontvangen.",
      });
    }

    const kind = String(req.body?.kind || "");
    const baseName =
      kind === "no-diploma" ? "zonder_diploma_audio" : "diploma_audio";

    const originalExtension = path.extname(req.file.originalname || "").toLowerCase();
    const allowedExtensions = [".mp3", ".wav", ".m4a", ".ogg", ".webm"];
    const extension = allowedExtensions.includes(originalExtension)
      ? originalExtension
      : ".mp3";

    const finalFileName = `${baseName}${extension}`;
    const finalPath = path.join(audioUploadsDirectory, finalFileName);

    await ensureDirectory(audioUploadsDirectory);

    try {
      await fs.rm(finalPath, { force: true });
    } catch {}

    await fs.rename(req.file.path, finalPath);

    res.json({
      path: `/uploads/audio/${finalFileName}`,
    });
  } catch (error) {
    console.error("Eindscherm audio upload mislukt:", error);

    res.status(500).json({
      error: "Eindscherm audio upload mislukt.",
    });
  }
});

app.post("/api/upload/audio", audioUpload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "Geen audio ontvangen.",
    });
  }

  res.json({
    path: `/uploads/audio/${req.file.filename}`,
  });
});

app.post("/api/media/delete", async (req, res) => {
  try {
    const paths = Array.isArray(req.body?.paths) ? req.body.paths : [];
    const deleted = [];

    for (const publicPath of paths) {
      const resolvedPath = safePublicFilePath(publicPath);

      if (!resolvedPath) {
        continue;
      }

      await fs.rm(resolvedPath, {
        force: true,
      });

      deleted.push(publicPath);
    }

    res.json({
      ok: true,
      deleted,
    });
  } catch (error) {
    console.error("Media verwijderen mislukt:", error);

    res.status(500).json({
      error: "Media verwijderen mislukt.",
    });
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(distDirectory));

  app.get("*", (req, res) => {
    res.sendFile(path.join(distDirectory, "index.html"));
  });
}

async function startServer() {
  await initialiseFiles();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Fossielenspoor draait op http://127.0.0.1:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Server kon niet starten:", error);
  process.exit(1);
});