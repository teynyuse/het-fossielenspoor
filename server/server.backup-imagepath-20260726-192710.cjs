const express = require("express");
const multer = require("multer");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const app = express();
const port = Number(process.env.PORT || 3000);

const projectDirectory = path.resolve(__dirname, "..");
const distDirectory = path.join(projectDirectory, "dist");
const fossilsFile = path.join(
  projectDirectory,
  "public",
  "data",
  "fossils.json",
);
const imageDirectory = path.join(
  projectDirectory,
  "public",
  "fossiel-images",
);
const currentScanFile = path.join(
  projectDirectory,
  "data",
  "current-scan.json",
);

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normaliseUid(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "");
}

function cleanList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .map(cleanText)
      .map(normaliseUid)
      .filter(Boolean),
  )];
}

function cleanImagePaths(value) {
  const imagePaths = Array.isArray(value)
    ? value.slice(0, 3).map(cleanText)
    : [];

  while (imagePaths.length < 3) {
    imagePaths.push("");
  }

  return imagePaths;
}


function cleanLedNumber(value, fallback) {
  const ledNumber = Number(value);

  if (
    Number.isInteger(ledNumber) &&
    ledNumber >= 1 &&
    ledNumber <= 8
  ) {
    return ledNumber;
  }

  return fallback;
}

function cleanFossil(value, fallbackLedNumber = 1) {
  return {
    id: cleanText(value?.id),
    name: cleanText(value?.name),
    period: cleanText(value?.period),
    age: cleanText(value?.age),
    shortDescription: cleanText(value?.shortDescription),
    audioScript: cleanText(value?.audioScript),
    rfidUids: cleanList(value?.rfidUids),
    imagePaths: cleanImagePaths(value?.imagePaths),
    ledNumber: cleanLedNumber(value?.ledNumber, fallbackLedNumber),
  };
}

function isSafeImagePath(imagePath) {
  return (
    imagePath === "" ||
    /^\/fossiel-images\/[A-Za-z0-9._-]+$/.test(imagePath)
  );
}

function validateStore(store) {
  if (!store || !Array.isArray(store.fossils)) {
    return {
      error: 'De data moet een lijst "fossils" bevatten.',
    };
  }

  if (store.fossils.length !== 8) {
    return {
      error: "Er moeten altijd exact 8 fossielen zijn.",
    };
  }

  const fossils = store.fossils.map((fossil, index) => cleanFossil(fossil, index + 1));
  const usedIds = new Set();

  for (const fossil of fossils) {
    if (!fossil.id) {
      return {
        error: "Elk fossiel moet een technische ID hebben.",
      };
    }

    if (!fossil.name) {
      return {
        error: "Elk fossiel moet een naam hebben.",
      };
    }

    if (usedIds.has(fossil.id)) {
      return {
        error: `Dubbele fossiel-ID: ${fossil.id}`,
      };
    }

    usedIds.add(fossil.id);

    for (const imagePath of fossil.imagePaths) {
      if (!isSafeImagePath(imagePath)) {
        return {
          error: "Een afbeeldingspad is niet geldig.",
        };
      }
    }
  }

  return {
    store: {
      fossils,
    },
  };
}

async function readJson(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  const temporaryFile = `${filePath}.tmp`;

  await fs.writeFile(
    temporaryFile,
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );

  await fs.rename(temporaryFile, filePath);
}

async function readStore() {
  return readJson(fossilsFile, {
    fossils: [],
  });
}

async function readCurrentScan() {
  const scan = await readJson(currentScanFile, {
    uid: "",
    time: 0,
  });

  return {
    uid: normaliseUid(scan.uid),
    time: Number(scan.time) || 0,
  };
}

const storage = multer.diskStorage({
  destination(_request, _file, callback) {
    callback(null, imageDirectory);
  },

  filename(_request, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();

    callback(
      null,
      `${Date.now()}-${crypto.randomUUID()}${extension}`,
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter(_request, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(extension)) {
      callback(
        new Error("Gebruik een JPG, PNG of WEBP afbeelding."),
      );
      return;
    }

    callback(null, true);
  },
});

app.use(express.json({
  limit: "2mb",
}));

app.get("/api/fossils", async (_request, response) => {
  try {
    const store = await readStore();
    response.json(store);
  } catch {
    response.status(500).json({
      error: "Fossielen konden niet geladen worden.",
    });
  }
});

app.put("/api/fossils", async (request, response) => {
  const result = validateStore(request.body);

  if (result.error) {
    response.status(400).json({
      error: result.error,
    });
    return;
  }

  try {
    await writeJson(fossilsFile, result.store);
    response.json(result.store);
  } catch {
    response.status(500).json({
      error: "Fossielen konden niet opgeslagen worden.",
    });
  }
});

app.get("/api/current-scan", async (_request, response) => {
  const currentScan = await readCurrentScan();
  response.json(currentScan);
});

app.post("/api/current-scan", async (request, response) => {
  const uid = normaliseUid(request.body?.uid);

  if (!uid) {
    response.status(400).json({
      error: "Een geldige RFID UID ontbreekt.",
    });
    return;
  }

  const currentScan = {
    uid,
    time: Date.now(),
  };

  try {
    await writeJson(currentScanFile, currentScan);
    response.json(currentScan);
  } catch {
    response.status(500).json({
      error: "De huidige scan kon niet opgeslagen worden.",
    });
  }
});

app.get("/api/images", async (_request, response) => {
  try {
    const files = await fs.readdir(imageDirectory);

    const images = files
      .filter((file) =>
        allowedExtensions.has(
          path.extname(file).toLowerCase(),
        ),
      )
      .sort()
      .map((file) => `/fossiel-images/${file}`);

    response.json({
      images,
    });
  } catch {
    response.status(500).json({
      error: "Afbeeldingen konden niet geladen worden.",
    });
  }
});

app.post("/api/images", upload.single("image"), (request, response) => {
  if (!request.file) {
    response.status(400).json({
      error: "Kies eerst een afbeelding.",
    });
    return;
  }

  response.status(201).json({
    path: `/fossiel-images/${request.file.filename}`,
  });
});

app.use(
  "/fossiel-images",
  express.static(imageDirectory),
);

app.use(express.static(distDirectory));

app.use((request, response, next) => {
  if (
    request.method !== "GET" ||
    request.path.startsWith("/api/")
  ) {
    next();
    return;
  }

  response.sendFile(
    path.join(distDirectory, "index.html"),
    (error) => {
      if (error) {
        next(error);
      }
    },
  );
});

app.use((error, _request, response, _next) => {
  response.status(400).json({
    error: error.message || "Er ging iets mis.",
  });
});

async function startServer() {
  await fs.mkdir(path.dirname(fossilsFile), {
    recursive: true,
  });

  await fs.mkdir(imageDirectory, {
    recursive: true,
  });

  await fs.mkdir(path.dirname(currentScanFile), {
    recursive: true,
  });

  app.listen(port, "0.0.0.0", () => {
    console.log(
      `Fossielenspoor draait op http://127.0.0.1:${port}`,
    );
  });
}

startServer();
