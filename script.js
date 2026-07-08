// ─── DOM refs — navigation & layout ───────────────────────────
const saveButton          = document.getElementById("saveButton");
const cancelCreateButton  = document.getElementById("cancelCreateButton");
const createHeading       = document.getElementById("createHeading");
const notesList           = document.getElementById("notesList");
const searchInput         = document.getElementById("searchInput");
const newNoteButton       = document.getElementById("newNoteButton");
const savedNotesButton    = document.getElementById("savedNotesButton");
const createSection       = document.getElementById("createSection");
const savedSection        = document.getElementById("savedSection");
const readerSection       = document.getElementById("readerSection");
const backToLibraryButton = document.getElementById("backToLibraryButton");
const folderList          = document.getElementById("folderList");
const themeButton         = document.getElementById("themeButton");
const saveReaderButton    = document.getElementById("saveReaderButton");
const draftStatus         = document.getElementById("draftStatus");
const draftBanner         = document.getElementById("draftBanner");
const draftBannerText     = document.getElementById("draftBannerText");
const draftRestoreButton  = document.getElementById("draftRestoreButton");
const draftDiscardButton  = document.getElementById("draftDiscardButton");

// ─── DOM refs — reader content ────────────────────────────────
const readerTitle         = document.getElementById("readerTitle");
const readerMeta          = document.getElementById("readerMeta");
const summaryEditor       = document.getElementById("summaryEditor");
const takeawaysEditor     = document.getElementById("takeawaysEditor");
const questionsText       = document.getElementById("questionsText");
const examplesText        = document.getElementById("examplesText");
const personalNotesEditor = document.getElementById("personalNotesEditor");
const questionImageInput  = document.getElementById("questionImageInput");
const exampleImageInput   = document.getElementById("exampleImageInput");
const questionImagePreview = document.getElementById("questionImagePreview");
const exampleImagePreview  = document.getElementById("exampleImagePreview");

// ─── DOM refs — reader AI (single set, no duplicates) ─────────
const readerSummaryImageInput       = document.getElementById("readerSummaryImageInput");
const readerSummaryImagePreview     = document.getElementById("readerSummaryImagePreview");
const readerSummaryPageCounter      = document.getElementById("readerSummaryPageCounter");
const readerGenerateSummaryButton   = document.getElementById("readerGenerateSummaryButton");
const readerSummaryAiStatus         = document.getElementById("readerSummaryAiStatus");

const readerTakeawaysImageInput     = document.getElementById("readerTakeawaysImageInput");
const readerTakeawaysImagePreview   = document.getElementById("readerTakeawaysImagePreview");
const readerTakeawaysPageCounter    = document.getElementById("readerTakeawaysPageCounter");
const readerGenerateTakeawaysButton = document.getElementById("readerGenerateTakeawaysButton");
const readerTakeawaysAiStatus       = document.getElementById("readerTakeawaysAiStatus");
const readerGenerateMnemonicsButton = document.getElementById("readerGenerateMnemonicsButton");
const readerMnemonicsAiStatus       = document.getElementById("readerMnemonicsAiStatus");

const readerQuestionsAiImageInput   = document.getElementById("readerQuestionsAiImageInput");
const readerQuestionsAiImagePreview = document.getElementById("readerQuestionsAiImagePreview");
const readerQuestionsPageCounter    = document.getElementById("readerQuestionsPageCounter");
const readerGenerateQuestionsButton = document.getElementById("readerGenerateQuestionsButton");
const readerQuestionsAiStatus       = document.getElementById("readerQuestionsAiStatus");
const readerConceptHelpInput        = document.getElementById("readerConceptHelpInput");
const readerGetConceptHelpButton    = document.getElementById("readerGetConceptHelpButton");
const readerConceptHelpStatus       = document.getElementById("readerConceptHelpStatus");
const examplesAskInput              = document.getElementById("examplesAskInput");
const examplesAskButton             = document.getElementById("examplesAskButton");
const examplesAskStatus             = document.getElementById("examplesAskStatus");

const readerExamplesAiImageInput    = document.getElementById("readerExamplesAiImageInput");
const readerExamplesAiImagePreview  = document.getElementById("readerExamplesAiImagePreview");
const readerExamplesPageCounter     = document.getElementById("readerExamplesPageCounter");
const readerGenerateExamplesButton  = document.getElementById("readerGenerateExamplesButton");
const readerExamplesAiStatus        = document.getElementById("readerExamplesAiStatus");

// ─── State ────────────────────────────────────────────────────
const MAX_PAGES = 150;
let readerStagedSummaryImages   = [];
let readerStagedTakeawaysImages = [];
let readerStagedQuestionImages  = [];
let readerStagedExamplesImages  = [];

let notes      = [];
let editingId  = null;
let openNoteId = null;

// ─── Draft Manager — localStorage autosave ─────────────────────
// Saves text content only. Images stay in JS memory (staged arrays).
// Images survive internal navigation because openNote() now checks
// if the same note is already open before clearing state.

const DRAFT_PREFIX    = "readora_draft_";
const DRAFT_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const DraftManager = {
  save: function (noteId) {
    if (!noteId) return;
    const draft = {
      summary:       summaryEditor.value,
      takeaways:     takeawaysEditor.value,
      questions:     questionsText.value,
      examples:      examplesText.value,
      personalNotes: personalNotesEditor.value,
      savedAt:       Date.now()
    };
    try {
      localStorage.setItem(DRAFT_PREFIX + noteId, JSON.stringify(draft));
    } catch (e) {
      console.warn("Draft save failed (storage full?):", e);
    }
  },

  load: function (noteId) {
    try {
      const raw = localStorage.getItem(DRAFT_PREFIX + noteId);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      // Expire old drafts
      if (Date.now() - draft.savedAt > DRAFT_EXPIRE_MS) {
        this.clear(noteId);
        return null;
      }
      return draft;
    } catch (e) { return null; }
  },

  clear: function (noteId) {
    if (!noteId) return;
    localStorage.removeItem(DRAFT_PREFIX + noteId);
  },

  // Is the draft meaningfully different from what's saved in Supabase?
  isDirty: function (noteId) {
    const draft = this.load(noteId);
    if (!draft) return false;
    const note = notes.find(function (n) { return n.id === noteId; });
    if (!note) return false;
    return draft.summary       !== (note.summary       || "") ||
           draft.takeaways     !== (note.takeaways      || "") ||
           draft.questions     !== (note.questions      || "") ||
           draft.examples      !== (note.examples       || "") ||
           draft.personalNotes !== (note.personalNotes  || "");
  },

  timeSince: function (noteId) {
    const draft = this.load(noteId);
    if (!draft) return "";
    const mins = Math.round((Date.now() - draft.savedAt) / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return mins + " min ago";
    const hrs = Math.round(mins / 60);
    return hrs + " hr ago";
  }
};

// ─── Autosave — debounced 2 seconds after last keystroke ────────
let autosaveTimer = null;

function scheduleAutosave() {
  if (!openNoteId) return;
  clearTimeout(autosaveTimer);
  showDraftStatus("Unsaved changes…", false);
  autosaveTimer = setTimeout(function () {
    DraftManager.save(openNoteId);
    showDraftStatus("Draft saved", true);
    setTimeout(function () {
      if (draftStatus.textContent === "Draft saved") draftStatus.textContent = "";
    }, 2000);
  }, 2000);
}

function showDraftStatus(msg, isSaved) {
  draftStatus.textContent = msg;
  draftStatus.classList.toggle("draft-saved", isSaved);
  draftStatus.classList.toggle("draft-dirty", !isSaved);
}

// ─── Unsaved changes check (staged images OR text diff) ─────────
function hasUnsavedChanges() {
  if (!openNoteId) return false;
  const hasImages = readerStagedSummaryImages.length   > 0 ||
                    readerStagedTakeawaysImages.length  > 0 ||
                    readerStagedQuestionImages.length   > 0 ||
                    readerStagedExamplesImages.length   > 0;
  return hasImages || DraftManager.isDirty(openNoteId);
}

// ─── Section switching ─────────────────────────────────────────
// One section visible at a time — no scroll-based navigation.

function showSection(name) {
  createSection.classList.toggle("hidden", name !== "create");
  savedSection.classList.toggle("hidden",  name !== "saved");
  readerSection.classList.toggle("hidden", name !== "reader");
  window.scrollTo(0, 0);
  // Persist so page reloads can restore position
  localStorage.setItem("readora_section", name);
}

// ─── Supabase helpers ──────────────────────────────────────────

async function getCurrentUser() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session ? data.session.user : null;
}

async function loadNotes() {
  const { data, error } = await supabaseClient
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { console.error("Error loading notes:", error); return; }

  notes = data.map(function (n) {
    return {
      id: n.id,
      title:         n.title         || "",
      source:        n.source        || "",
      category:      n.category      || "",
      folder:        n.folder        || "",
      summary:       n.summary       || "",
      takeaways:     n.takeaways     || "",
      questions:     n.questions     || "",
      examples:      n.examples      || "",
      personalNotes: n.personal_notes || "",
      questionImages: [],
      exampleImages:  []
    };
  });

  showNotes();
  showFoldersInSidebar();
}

async function saveNoteToSupabase(noteData) {
  const user = await getCurrentUser();
  if (!user) return null;

  const row = {
    user_id:       user.id,
    title:         noteData.title,
    source:        noteData.source,
    category:      noteData.category,
    folder:        noteData.folder,
    summary:       noteData.summary,
    takeaways:     noteData.takeaways,
    questions:     noteData.questions,
    examples:      noteData.examples,
    personal_notes: noteData.personalNotes
  };

  const { data, error } = await supabaseClient
    .from("notes").insert(row).select().single();

  if (error) { console.error("Insert error:", error); return null; }
  return data;
}

async function updateNoteInSupabase(id, noteData) {
  const row = {
    title:         noteData.title,
    source:        noteData.source,
    category:      noteData.category,
    folder:        noteData.folder,
    summary:       noteData.summary,
    takeaways:     noteData.takeaways,
    questions:     noteData.questions,
    examples:      noteData.examples,
    personal_notes: noteData.personalNotes
  };

  const { error } = await supabaseClient
    .from("notes").update(row).eq("id", id);

  if (error) console.error("Update error:", error);
}

async function deleteNoteFromSupabase(id) {
  const { error } = await supabaseClient
    .from("notes").delete().eq("id", id);

  if (error) console.error("Delete error:", error);
}

// ─── File helpers ──────────────────────────────────────────────

// readImages — for saved note images (question/example), returns plain dataUrls
function readImages(files) {
  return Promise.all(Array.from(files).map(function (file) {
    return new Promise(function (resolve) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.readAsDataURL(file);
    });
  }));
}

// readFiles — for AI upload sections, returns {dataUrl, fileType, fileName}
function readFiles(files) {
  return Promise.all(Array.from(files).map(function (file) {
    return new Promise(function (resolve) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve({ dataUrl: reader.result, fileType: file.type, fileName: file.name });
      };
      reader.readAsDataURL(file);
    });
  }));
}

function getBase64Data(dataUrl) { return dataUrl.split(",")[1]; }

function getMediaType(dataUrl) {
  const match = dataUrl.match(/data:(image\/[a-zA-Z]+);base64/);
  return match ? match[1] : "image/jpeg";
}

function truncateFileName(name) {
  return name.length > 22 ? name.slice(0, 20) + "…" : name;
}

function updatePageCounter(counter, count) {
  counter.textContent = count + " / " + MAX_PAGES + " files";
  counter.style.color = count >= MAX_PAGES ? "#8b2f2f" : "";
}

// showFormFiles — renders staged files (images + PDFs) in upload preview areas
function showFormFiles(container, files, type) {
  container.innerHTML = "";
  files.forEach(function (file, index) {
    const card = document.createElement("div");

    if (file.fileType === "application/pdf") {
      card.classList.add("image-card", "pdf-card");
      card.innerHTML =
        '<div class="pdf-icon">📄</div>' +
        '<p class="page-label" title="' + file.fileName + '">' + truncateFileName(file.fileName) + '</p>' +
        '<button class="remove-image-btn" onclick="removeFormImage(\'' + type + '\', ' + index + ')">Remove</button>';
    } else {
      card.classList.add("image-card");
      card.innerHTML =
        '<img src="' + file.dataUrl + '" alt="Page ' + (index + 1) + '">' +
        '<p class="page-label">Page ' + (index + 1) + '</p>' +
        '<button class="remove-image-btn" onclick="removeFormImage(\'' + type + '\', ' + index + ')">Remove</button>';
    }
    container.appendChild(card);
  });
}

function showImages(container, images, type) {
  container.innerHTML = "";
  images.forEach(function (image, index) {
    const card = document.createElement("div");
    card.classList.add("image-card");
    card.innerHTML =
      '<img src="' + image + '" alt="Saved image">' +
      '<button class="remove-image-btn" onclick="removeImage(\'' + type + '\', ' + index + ')">Remove</button>';
    container.appendChild(card);
  });
}

// ─── removeFormImage — reader staged images only ───────────────
// (Create form no longer has AI upload sections.)

window.removeFormImage = function (type, index) {
  const map = {
    readerSummaryStaged:   [readerStagedSummaryImages,   readerSummaryPageCounter,   readerSummaryImagePreview,   readerGenerateSummaryButton],
    readerTakeawaysStaged: [readerStagedTakeawaysImages, readerTakeawaysPageCounter, readerTakeawaysImagePreview, readerGenerateTakeawaysButton],
    readerQuestionsStaged: [readerStagedQuestionImages,  readerQuestionsPageCounter, readerQuestionsAiImagePreview, readerGenerateQuestionsButton],
    readerExamplesStaged:  [readerStagedExamplesImages,  readerExamplesPageCounter,  readerExamplesAiImagePreview, readerGenerateExamplesButton]
  };

  const entry = map[type];
  if (!entry) return;
  const [arr, counter, preview, btn] = entry;
  arr.splice(index, 1);
  updatePageCounter(counter, arr.length);
  showFormFiles(preview, arr, type);
  btn.disabled = arr.length === 0;
};

// ─── AI — Claude API call ──────────────────────────────────────

function getNoteMeta() {
  if (openNoteId) {
    const note = notes.find(function (n) { return n.id === openNoteId; });
    if (note) return { title: note.title || "this book", source: note.source || "" };
  }
  return { title: "this book", source: "" };
}

async function callClaudeAPI(payload) {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) throw new Error("Please log in to use AI.");

  const response = await fetch(SUPABASE_URL + "/functions/v1/claude-proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + data.session.access_token,
      "apikey": SUPABASE_PUBLISHABLE_KEY
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error && result.error.message ? result.error.message : "AI request failed");
  }
  return result;
}

function appendToField(fieldEl, text) {
  const existing = fieldEl.value.trim();
  fieldEl.value = existing ? existing + "\n\n" + text : text;
}

// ─── Stream detection ──────────────────────────────────────────
// Detects subject stream from the note's category field so Takeaways
// generates stream-appropriate sections (formulas for science,
// key thinkers for humanities, pathways for medical, etc.)

function getStreamType() {
  if (!openNoteId) return "science";
  const note = notes.find(function (n) { return n.id === openNoteId; });
  if (!note || !note.category) return "science";
  const cat = (note.category + " " + (note.title || "")).toLowerCase();
  if (/mbbs|medical|pharma|anatomy|physiology|biochem|pathology|micro|neet bio|medicine/.test(cat)) return "medical";
  if (/history|geography|polity|political|sociology|economics|literature|arts|ba|humanities|law|psychology|english|hindi|philosophy/.test(cat)) return "humanities";
  if (/commerce|accounts|accountancy|business|finance|bcom|management|marketing/.test(cat)) return "commerce";
  return "science"; // default — JEE, NEET Physics/Chem, BTech, BSc
}

function getTakeawaysSystemPrompt() {
  const stream = getStreamType();

  if (stream === "medical") {
    return "You are a revision assistant inside Readora AI for a medical student (MBBS/NEET). The student has already studied this material. Generate a structured revision reference sheet with exactly these 4 sections:\n\n📌 CORE CONCEPTS\n• [key ideas the student must remember — diseases, mechanisms, classifications]\n\n🔬 MECHANISMS & PATHWAYS\n• [biochemical pathways, disease mechanisms, drug mechanisms of action]\n(If none, write: None for this topic.)\n\n⚠️ CLINICAL PEARLS & EXCEPTIONS\n• [high-yield exam facts, exceptions, common MCQ traps in medical exams]\n\n📖 KEY DEFINITIONS\n• [medical terms with precise, exam-ready definitions]\n\nBe precise. Assume the student has attended lectures and read their notes before.";
  }

  if (stream === "humanities") {
    return "You are a revision assistant inside Readora AI for a humanities student (BA/MA/History/Law/Sociology etc.). The student has already studied this material. Generate a structured revision reference sheet with exactly these 4 sections:\n\n📌 CORE ARGUMENTS & IDEAS\n• [main arguments, themes, and ideas the student must remember]\n\n💬 KEY THINKERS & THEIR VIEWS\n• [thinker/author name: their position on this topic in one clear sentence]\n(If none, write: None for this topic.)\n\n⚠️ COUNTERARGUMENTS & NUANCES\n• [opposing views, limitations, things examiners expect students to critically engage with]\n\n📖 KEY TERMS & DEFINITIONS\n• [term: precise, exam-ready definition or meaning in this context]\n\nBe precise. Assume the student has read and attended class on this material before.";
  }

  if (stream === "commerce") {
    return "You are a revision assistant inside Readora AI for a commerce student (BCom/CA/BBA etc.). The student has already studied this material. Generate a structured revision reference sheet with exactly these 4 sections:\n\n📌 CORE CONCEPTS\n• [key concepts, principles, and ideas the student must remember]\n\n🔢 FORMULAS & RATIOS\n• [each formula/ratio: name | formula | what it measures | when to use it]\n(If none, write: None for this topic.)\n\n⚠️ EXCEPTIONS & IMPORTANT NOTES\n• [exceptions to rules, examiner traps, commonly confused concepts]\n\n📖 KEY DEFINITIONS\n• [term: precise, exam-ready definition]\n\nBe precise. Assume prior study of this material.";
  }

  // Default — Science / JEE / NEET / BTech
  return "You are a revision assistant inside Readora AI. The student has already studied this material. Your job is to extract and organise — NOT to teach from scratch. Generate a structured revision reference sheet with exactly these 4 sections:\n\n📌 CORE CONCEPTS\n• [main ideas in plain, clear language — what the student must remember]\n\n🔢 FORMULAS & EQUATIONS\n• [each formula: name | formula | what each variable means | when to apply]\n(If no formulas exist for this topic, write: None for this topic.)\n\n⚠️ EXCEPTIONS & SPECIAL CASES\n• [edge cases, common exam traps, 'but wait' moments students miss]\n(If none, write: None for this topic.)\n\n📖 KEY DEFINITIONS\n• [term: precise, exam-ready definition]\n\nBe precise. Be exam-focused. Assume the student has seen this material before.";
}

async function callClaudeWithImages(images, mode, getExistingText) {
  const meta = getNoteMeta();
  const existingText = getExistingText();

  const systemPrompts = {
    summary:   "You are a revision assistant inside Readora AI. The student has already studied this material. Read the uploaded content carefully and write a clear, well-structured summary in paragraph form. Assume prior exposure — do not over-explain basics. Be comprehensive but concise. If the student already has notes, add to them without repeating.",
    takeaways: getTakeawaysSystemPrompt(),
    questions: "You are a patient revision tutor inside Readora AI. The student has already studied this topic. For each question in the uploaded content: (1) restate what is being asked, (2) reconnect the student with the underlying concept — assume they once knew this, (3) outline the approach step by step. If the student already has notes, add to them without repeating.",
    examples:  "You are a revision assistant inside Readora AI. The student has already studied this material. Create clear, practical examples that reconnect them with the concepts. Use real-world analogies where helpful. Format as a numbered list. If the student already has examples, add new ones without repeating."
  };

  const taskPrompts = {
    summary:   "\n\nPlease write a revision summary of this content.",
    takeaways: "\n\nPlease generate the structured 4-section revision reference sheet.",
    questions: "\n\nPlease explain these questions to help the student reconnect with the concepts.",
    examples:  "\n\nPlease generate helpful examples that make these concepts click again."
  };

  // Build content array — handles both images and PDFs
  const userContent = [];
  images.forEach(function (file) {
    if (file.fileType === "application/pdf") {
      userContent.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: getBase64Data(file.dataUrl) } });
    } else {
      userContent.push({ type: "image", source: { type: "base64", media_type: getMediaType(file.dataUrl), data: getBase64Data(file.dataUrl) } });
    }
  });

  let prompt = 'Book/Chapter: "' + meta.title + '"';
  if (meta.source) prompt += "\nSource: " + meta.source;
  if (existingText) {
    if (mode === "takeaways") {
      prompt += "\n\nThe student already has these notes — incorporate them into the structured 4-section output. Do not repeat content, just enrich each section:\n" + existingText;
    } else {
      prompt += "\n\nStudent already has these notes — ADD to them, do not repeat:\n" + existingText;
    }
  }
  prompt += taskPrompts[mode];
  userContent.push({ type: "text", text: prompt });

  const data = await callClaudeAPI({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: systemPrompts[mode],
    messages: [{ role: "user", content: userContent }]
  });

  return data.content.map(function (b) { return b.text || ""; }).join("").trim();
}

async function callClaudeForConceptHelp(userMessage, context) {
  const meta = getNoteMeta();
  const questionsContent  = context.getQuestionsText();
  const summaryContent    = context.getSummaryText();
  const existingExamples  = context.getExamplesText();
  const images            = context.getQuestionImages();

  if (!questionsContent && images.length === 0) {
    throw new Error("Upload a question or run Explain with AI first.");
  }

  const systemPrompt = "You are a revision assistant inside Readora AI. The student is confused about a specific concept from their notes. Give a COMPLETE, self-contained explanation — do NOT ask follow-up questions, do NOT end with 'what else feels fuzzy?', do NOT prompt the student to respond. Just explain fully: (1) what the concept actually means in plain language, (2) a clear real-world analogy, (3) 2–3 concrete examples. End with a one-line summary that the student can remember. Be warm and clear.";

  const userContent = [];
  images.forEach(function (file) {
    if (file.fileType === "application/pdf") {
      userContent.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: getBase64Data(file.dataUrl) } });
    } else {
      userContent.push({ type: "image", source: { type: "base64", media_type: getMediaType(file.dataUrl), data: getBase64Data(file.dataUrl) } });
    }
  });

  let prompt = 'Book/Chapter: "' + meta.title + '"';
  if (meta.source) prompt += "\nSource: " + meta.source;
  if (summaryContent)   prompt += "\n\nContext from summary:\n" + summaryContent;
  if (questionsContent) prompt += "\n\nQuestion explanation so far:\n" + questionsContent;
  prompt += '\n\nStudent says: "' + userMessage + '"';
  prompt += "\n\nHelp the student understand using simpler language and practical examples.";
  if (existingExamples) prompt += "\n\nUser already has these examples — ADD new ones, do not repeat:\n" + existingExamples;
  userContent.push({ type: "text", text: prompt });

  const data = await callClaudeAPI({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }]
  });

  return data.content.map(function (b) { return b.text || ""; }).join("").trim();
}

async function callClaudeForMnemonics() {
  const takeawaysContent = takeawaysEditor.value.trim();
  const summaryContent   = summaryEditor.value.trim();

  if (!takeawaysContent && !summaryContent) {
    throw new Error("Generate Key Takeaways first, then generate mnemonics.");
  }

  const meta    = getNoteMeta();
  const stream  = getStreamType();
  const content = takeawaysContent || summaryContent;

  const focusHint = stream === "medical"
    ? "Focus on: drug names, classification lists, cranial nerves, enzyme names, pathways, disease features — anything that involves memorizing sequences or lists."
    : stream === "humanities"
    ? "Focus on: names of thinkers, dates, event sequences, article/section numbers, treaty names — anything that requires rote memorization."
    : "Focus on: formula variables, law names, classification sequences, reaction steps, element groups — anything that requires rote memorization.";

  const systemPrompt = "You are a memory expert helping a student memorize key information for their exam. Create clever, easy-to-remember mnemonics for the most important terms, lists, and concepts. Use acronyms, silly sentences, visual associations, rhymes, or story hooks — whatever works best for each item. Format clearly:\n🧠 [WHAT TO REMEMBER] → [MNEMONIC] → [what each part stands for]\nMake them genuinely memorable and a little fun.";

  const userMessage = 'Book/Chapter: "' + meta.title + '"\n'
    + (meta.source ? "Source: " + meta.source + "\n" : "")
    + "\nContent to create mnemonics for:\n" + content
    + "\n\n" + focusHint
    + "\n\nCreate 5–10 mnemonics for the hardest-to-memorize items above.";

  const data = await callClaudeAPI({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }]
  });

  return data.content.map(function (b) { return b.text || ""; }).join("").trim();
}

// ─── Reusable setup functions ──────────────────────────────────

function setupStagedImageUpload(inputEl, previewEl, counterEl, buttonEl, stagedRef, typeKey) {
  inputEl.addEventListener("change", async function () {
    const newFiles = await readFiles(inputEl.files);
    const remaining = MAX_PAGES - stagedRef.length;
    const toAdd = newFiles.length > remaining ? newFiles.slice(0, remaining) : newFiles;
    if (newFiles.length > remaining) alert("Only " + remaining + " more file(s) allowed.");
    toAdd.forEach(function (f) { stagedRef.push(f); });
    inputEl.value = "";
    updatePageCounter(counterEl, stagedRef.length);
    showFormFiles(previewEl, stagedRef, typeKey);
    buttonEl.disabled = stagedRef.length === 0;
  });
}

function setupAiGenerateButton(buttonEl, statusEl, stagedRef, mode, getFieldEl, statusMessages) {
  buttonEl.addEventListener("click", async function () {
    if (stagedRef.length === 0) return;
    buttonEl.disabled = true;
    statusEl.textContent = statusMessages.loading;
    try {
      const fieldEl = getFieldEl();
      const result = await callClaudeWithImages(stagedRef, mode, function () { return fieldEl.value.trim(); });
      appendToField(fieldEl, result);
      statusEl.textContent = statusMessages.success;
      setTimeout(function () { statusEl.textContent = ""; }, 3000);
    } catch (err) {
      statusEl.textContent = "❌ Failed: " + err.message;
    } finally {
      buttonEl.disabled = stagedRef.length === 0;
    }
  });
}

// Reader context for concept help (single context — no create-form duplicate)
const readerConceptContext = {
  getQuestionsText: function () { return questionsText.value.trim(); },
  getSummaryText:   function () { return summaryEditor.value.trim(); },
  getExamplesText:  function () { return examplesText.value.trim(); },
  getQuestionImages: function () { return readerStagedQuestionImages; },
  getExamplesField: function () { return examplesText; }
};

function setupConceptHelp(inputEl, helpBtn, statusEl, context) {
  helpBtn.addEventListener("click", async function () {
    const userMessage = inputEl.value.trim();
    if (!userMessage) {
      statusEl.textContent = "❌ Please type what you don't understand first.";
      setTimeout(function () { statusEl.textContent = ""; }, 3000);
      return;
    }
    helpBtn.disabled = true;
    statusEl.textContent = "Thinking…";
    try {
      const result = await callClaudeForConceptHelp(userMessage, context);
      appendToField(context.getExamplesField(), result);
      statusEl.textContent = "✅ Explanation added to Examples tab!";
      setTimeout(function () { statusEl.textContent = ""; }, 4000);
    } catch (err) {
      statusEl.textContent = "❌ Failed: " + err.message;
    } finally {
      helpBtn.disabled = false;
    }
  });

  // Allow pressing Enter to submit
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { helpBtn.click(); }
  });
}

function clearReaderAiState() {
  readerStagedSummaryImages.length   = 0;
  readerStagedTakeawaysImages.length = 0;
  readerStagedQuestionImages.length  = 0;
  readerStagedExamplesImages.length  = 0;
  readerSummaryImagePreview.innerHTML     = "";
  readerTakeawaysImagePreview.innerHTML   = "";
  readerQuestionsAiImagePreview.innerHTML = "";
  readerExamplesAiImagePreview.innerHTML  = "";
  updatePageCounter(readerSummaryPageCounter,   0);
  updatePageCounter(readerTakeawaysPageCounter, 0);
  updatePageCounter(readerQuestionsPageCounter, 0);
  updatePageCounter(readerExamplesPageCounter,  0);
  readerGenerateSummaryButton.disabled   = true;
  readerGenerateTakeawaysButton.disabled = true;
  readerGenerateQuestionsButton.disabled = true;
  readerGenerateExamplesButton.disabled  = true;
  readerSummaryAiStatus.textContent   = "";
  readerTakeawaysAiStatus.textContent = "";
  readerQuestionsAiStatus.textContent = "";
  readerExamplesAiStatus.textContent  = "";
  readerConceptHelpInput.value        = "";
  readerConceptHelpStatus.textContent = "";
}

// ─── Wire up reader AI (one set only) ─────────────────────────

setupStagedImageUpload(readerSummaryImageInput,     readerSummaryImagePreview,     readerSummaryPageCounter,   readerGenerateSummaryButton,   readerStagedSummaryImages,   "readerSummaryStaged");
setupStagedImageUpload(readerTakeawaysImageInput,   readerTakeawaysImagePreview,   readerTakeawaysPageCounter, readerGenerateTakeawaysButton, readerStagedTakeawaysImages, "readerTakeawaysStaged");
setupStagedImageUpload(readerQuestionsAiImageInput, readerQuestionsAiImagePreview, readerQuestionsPageCounter, readerGenerateQuestionsButton, readerStagedQuestionImages,  "readerQuestionsStaged");
setupStagedImageUpload(readerExamplesAiImageInput,  readerExamplesAiImagePreview,  readerExamplesPageCounter,  readerGenerateExamplesButton,  readerStagedExamplesImages,  "readerExamplesStaged");

setupAiGenerateButton(readerGenerateSummaryButton,   readerSummaryAiStatus,   readerStagedSummaryImages,   "summary",   function () { return summaryEditor; },   { loading: "Reading pages…",    success: "✅ Summary added!" });
setupAiGenerateButton(readerGenerateTakeawaysButton, readerTakeawaysAiStatus, readerStagedTakeawaysImages, "takeaways", function () { return takeawaysEditor; }, { loading: "Reading pages…",    success: "✅ Takeaways added!" });
setupAiGenerateButton(readerGenerateQuestionsButton, readerQuestionsAiStatus, readerStagedQuestionImages,  "questions", function () { return questionsText; },   { loading: "Reading questions…", success: "✅ Explanation added!" });
setupAiGenerateButton(readerGenerateExamplesButton,  readerExamplesAiStatus,  readerStagedExamplesImages,  "examples",  function () { return examplesText; },    { loading: "Reading pages…",    success: "✅ Examples added!" });

// ─── Mnemonic Generator ───────────────────────────────────────
readerGenerateMnemonicsButton.addEventListener("click", async function () {
  readerGenerateMnemonicsButton.disabled = true;
  readerMnemonicsAiStatus.textContent = "Creating memory tricks…";
  try {
    const result = await callClaudeForMnemonics();
    appendToField(takeawaysEditor, result);
    readerMnemonicsAiStatus.textContent = "✅ Mnemonics added!";
    setTimeout(function () { readerMnemonicsAiStatus.textContent = ""; }, 4000);
  } catch (err) {
    readerMnemonicsAiStatus.textContent = "❌ " + err.message;
  } finally {
    readerGenerateMnemonicsButton.disabled = false;
  }
});

setupConceptHelp(readerConceptHelpInput, readerGetConceptHelpButton, readerConceptHelpStatus, readerConceptContext);

// ─── Examples tab — Ask AI directly ───────────────────────────
function setupExamplesAsk() {
  async function runAsk() {
    const query = examplesAskInput.value.trim();
    if (!query) {
      examplesAskStatus.textContent = "❌ Type your question first.";
      setTimeout(function () { examplesAskStatus.textContent = ""; }, 3000);
      return;
    }
    examplesAskButton.disabled = true;
    examplesAskStatus.textContent = "Thinking…";
    try {
      const result = await callClaudeForConceptHelp(query, readerConceptContext);
      appendToField(examplesText, result);
      examplesAskInput.value = "";
      examplesAskStatus.textContent = "✅ Answer added!";
      setTimeout(function () { examplesAskStatus.textContent = ""; }, 4000);
    } catch (err) {
      examplesAskStatus.textContent = "❌ Failed: " + err.message;
    } finally {
      examplesAskButton.disabled = false;
    }
  }
  examplesAskButton.addEventListener("click", runAsk);
  examplesAskInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { runAsk(); }
  });
}
setupExamplesAsk();

// ─── Create / Update Note ──────────────────────────────────────

saveButton.addEventListener("click", async function () {
  const title = document.getElementById("title").value.trim();
  if (!title) { alert("Please add a title."); return; }

  saveButton.disabled = true;
  saveButton.textContent = "Saving…";

  if (editingId === null) {
    // ── Create new note with empty content, then auto-open reader ──
    const noteData = {
      title,
      source:        document.getElementById("source").value,
      category:      document.getElementById("category").value,
      folder:        document.getElementById("folder").value,
      summary:       "",
      takeaways:     "",
      questions:     "",
      examples:      "",
      personalNotes: ""
    };

    const saved = await saveNoteToSupabase(noteData);
    saveButton.disabled = false;
    saveButton.textContent = "Create Note";

    if (saved) {
      const newNote = Object.assign({ id: saved.id }, noteData, { questionImages: [], exampleImages: [] });
      notes.unshift(newNote);
      showNotes();
      showFoldersInSidebar();
      clearForm();
      openNote(saved.id); // ← auto-open reader immediately
    }

  } else {
    // ── Update metadata only — preserve all existing content ──
    const existing = notes.find(function (n) { return n.id === editingId; }) || {};
    const noteData = {
      title,
      source:        document.getElementById("source").value,
      category:      document.getElementById("category").value,
      folder:        document.getElementById("folder").value,
      summary:       existing.summary       || "",
      takeaways:     existing.takeaways     || "",
      questions:     existing.questions     || "",
      examples:      existing.examples      || "",
      personalNotes: existing.personalNotes || ""
    };

    await updateNoteInSupabase(editingId, noteData);
    const idx = notes.findIndex(function (n) { return n.id === editingId; });
    if (idx !== -1) notes[idx] = Object.assign({}, notes[idx], noteData);

    const updatedId = editingId;
    editingId = null;
    saveButton.disabled = false;
    saveButton.textContent = "Create Note";
    showNotes();
    showFoldersInSidebar();
    clearForm();
    openNote(updatedId); // ← return to reader after metadata update
  }
});

function clearForm() {
  ["title", "source", "category", "folder"].forEach(function (id) {
    document.getElementById(id).value = "";
  });
  createHeading.textContent = "New Note";
  saveButton.textContent = "Create Note";
}

// ─── Notes list ────────────────────────────────────────────────

function showNotes() {
  notesList.innerHTML = "";
  const searchText = searchInput.value.toLowerCase();

  const filtered = notes.filter(function (note) {
    const allText = [note.title, note.source, note.category, note.folder, note.summary, note.takeaways, note.questions, note.examples, note.personalNotes]
      .map(function (v) { return v || ""; }).join(" ").toLowerCase();
    return allText.includes(searchText);
  });

  if (filtered.length === 0) {
    notesList.innerHTML = notes.length === 0
      ? '<div class="empty-state"><p>No notes yet.</p><p>Click <strong>New Note</strong> in the sidebar to get started.</p></div>'
      : '<div class="empty-state"><p>No notes match your search.</p></div>';
    return;
  }

  const folders = {};
  filtered.forEach(function (note) {
    const name = note.folder && note.folder.trim() !== "" ? note.folder : "Unfoldered Notes";
    if (!folders[name]) folders[name] = [];
    folders[name].push(note);
  });

  Object.keys(folders).forEach(function (folderName) {
    const section = document.createElement("div");
    section.classList.add("folder-section");

    const h3 = document.createElement("h3");
    h3.textContent = folderName;
    section.appendChild(h3);

    folders[folderName].forEach(function (note) {
      const card = document.createElement("div");
      card.classList.add("note-card");
      const metaParts = [note.source, note.category].filter(Boolean).join(" · ");
      card.innerHTML =
        '<h4>' + (note.title || "Untitled Note") + '</h4>' +
        (metaParts ? '<p class="note-meta">' + metaParts + '</p>' : '') +
        '<div class="card-actions">' +
        '<button class="open-btn"   onclick="openNote(\'' + note.id + '\')">Open</button>' +
        '<button class="edit-btn"   onclick="editNote(\'' + note.id + '\')">Edit Info</button>' +
        '<button class="delete-btn" onclick="deleteNote(\'' + note.id + '\')">Delete</button>' +
        '</div>';
      section.appendChild(card);
    });

    notesList.appendChild(section);
  });
}

function showFoldersInSidebar() {
  folderList.innerHTML = "";
  const folderNames = [];
  notes.forEach(function (note) {
    const name = note.folder && note.folder.trim() !== "" ? note.folder : "Unfoldered Notes";
    if (!folderNames.includes(name)) folderNames.push(name);
  });

  if (folderNames.length === 0) {
    folderList.innerHTML = "<p class='empty-folders'>No folders yet</p>";
    return;
  }

  folderNames.forEach(function (name) {
    const btn = document.createElement("button");
    btn.classList.add("folder-btn");
    btn.textContent = name;
    btn.addEventListener("click", function () {
      searchInput.value = name;
      showNotes();
      showSection("saved");
    });
    folderList.appendChild(btn);
  });
}

// ─── Open / Edit / Delete ──────────────────────────────────────

window.openNote = function (id) {
  const note = notes.find(function (n) { return n.id === id; });
  if (!note) return;

  // ── Same note already open — just show reader, preserve all state ──
  if (openNoteId === id) {
    showSection("reader");
    return;
  }

  // ── Different note — warn if there are unsaved changes ──
  if (openNoteId && hasUnsavedChanges()) {
    const leave = confirm(
      "You have unsaved changes in this note.\n\n" +
      "Your text is saved as a draft and will be here when you return.\n" +
      "But staged images will be lost.\n\n" +
      "Leave anyway?"
    );
    if (!leave) return;
    // Save text draft before leaving so it can be restored
    DraftManager.save(openNoteId);
  }

  openNoteId = id;
  localStorage.setItem("readora_open_note", id);

  readerTitle.textContent = note.title || "Untitled Note";
  const metaParts = [note.source, note.category, note.folder].filter(Boolean);
  readerMeta.textContent = metaParts.join(" · ");

  // ── Check for a local draft newer than saved content ──
  const draft = DraftManager.load(id);
  const hasDraft = draft && (
    draft.summary       !== (note.summary       || "") ||
    draft.takeaways     !== (note.takeaways      || "") ||
    draft.questions     !== (note.questions      || "") ||
    draft.examples      !== (note.examples       || "") ||
    draft.personalNotes !== (note.personalNotes  || "")
  );

  if (hasDraft) {
    // Show saved content first, then offer to restore draft
    summaryEditor.value       = note.summary       || "";
    takeawaysEditor.value     = note.takeaways      || "";
    questionsText.value       = note.questions      || "";
    examplesText.value        = note.examples       || "";
    personalNotesEditor.value = note.personalNotes  || "";

    draftBannerText.textContent = "You have an unsaved draft from " + DraftManager.timeSince(id) + ".";
    draftBanner.classList.remove("hidden");
  } else {
    summaryEditor.value       = note.summary       || "";
    takeawaysEditor.value     = note.takeaways      || "";
    questionsText.value       = note.questions      || "";
    examplesText.value        = note.examples       || "";
    personalNotesEditor.value = note.personalNotes  || "";
    draftBanner.classList.add("hidden");
    draftStatus.textContent = "";
  }

  if (!note.questionImages) note.questionImages = [];
  if (!note.exampleImages)  note.exampleImages  = [];
  showImages(questionImagePreview, note.questionImages, "question");
  showImages(exampleImagePreview,  note.exampleImages,  "example");

  clearReaderAiState();

  // Always open on Summary tab
  document.querySelectorAll(".tab-btn").forEach(function (btn) { btn.classList.remove("active"); });
  document.querySelectorAll(".reader-page").forEach(function (page) { page.classList.remove("active-page"); });
  const firstBtn = document.querySelector(".tab-btn");
  if (firstBtn) {
    firstBtn.classList.add("active");
    const panel = document.getElementById(firstBtn.dataset.tab);
    if (panel) panel.classList.add("active-page");
  }

  showSection("reader");
};

window.editNote = function (id) {
  const note = notes.find(function (n) { return n.id === id; });
  if (!note) return;
  document.getElementById("title").value    = note.title    || "";
  document.getElementById("source").value   = note.source   || "";
  document.getElementById("category").value = note.category || "";
  document.getElementById("folder").value   = note.folder   || "";
  editingId = id;
  saveButton.textContent = "Update Note Info";
  createHeading.textContent = "Edit Note Info";
  showSection("create");
};

window.deleteNote = async function (id) {
  if (!confirm("Delete this note?")) return;
  await deleteNoteFromSupabase(id);
  notes = notes.filter(function (n) { return n.id !== id; });
  if (openNoteId === id) { openNoteId = null; showSection("saved"); }
  showNotes();
  showFoldersInSidebar();
};

window.removeImage = function (type, index) {
  const note = notes.find(function (n) { return n.id === openNoteId; });
  if (!note) return;
  if (type === "question") {
    note.questionImages.splice(index, 1);
    showImages(questionImagePreview, note.questionImages, "question");
  }
  if (type === "example") {
    note.exampleImages.splice(index, 1);
    showImages(exampleImagePreview, note.exampleImages, "example");
  }
};

// ─── Save Reader ───────────────────────────────────────────────

saveReaderButton.addEventListener("click", async function () {
  if (!openNoteId) return;
  const note = notes.find(function (n) { return n.id === openNoteId; });
  if (!note) return;

  saveReaderButton.disabled = true;
  saveReaderButton.textContent = "Saving…";

  note.summary       = summaryEditor.value;
  note.takeaways     = takeawaysEditor.value;
  note.questions     = questionsText.value;
  note.examples      = examplesText.value;
  note.personalNotes = personalNotesEditor.value;

  await updateNoteInSupabase(openNoteId, note);

  // Clear draft — content is now saved to Supabase
  DraftManager.clear(openNoteId);
  draftBanner.classList.add("hidden");
  draftStatus.textContent = "";

  const qImages = await readImages(questionImageInput.files);
  const eImages = await readImages(exampleImageInput.files);
  note.questionImages = (note.questionImages || []).concat(qImages);
  note.exampleImages  = (note.exampleImages  || []).concat(eImages);
  questionImageInput.value = "";
  exampleImageInput.value  = "";

  showImages(questionImagePreview, note.questionImages, "question");
  showImages(exampleImagePreview,  note.exampleImages,  "example");
  showNotes();

  saveReaderButton.disabled = false;
  saveReaderButton.textContent = "Saved ✓";
  setTimeout(function () { saveReaderButton.textContent = "Save Changes"; }, 2000);
});

// ─── Draft banner — Restore / Discard ─────────────────────────
draftRestoreButton.addEventListener("click", function () {
  const draft = DraftManager.load(openNoteId);
  if (!draft) return;
  summaryEditor.value       = draft.summary       || "";
  takeawaysEditor.value     = draft.takeaways      || "";
  questionsText.value       = draft.questions      || "";
  examplesText.value        = draft.examples       || "";
  personalNotesEditor.value = draft.personalNotes  || "";
  draftBanner.classList.add("hidden");
  showDraftStatus("Draft restored", true);
  setTimeout(function () { draftStatus.textContent = ""; }, 2000);
});

draftDiscardButton.addEventListener("click", function () {
  DraftManager.clear(openNoteId);
  draftBanner.classList.add("hidden");
  draftStatus.textContent = "";
});

// ─── Autosave — attach to all content textareas ───────────────
[summaryEditor, takeawaysEditor, questionsText, examplesText, personalNotesEditor]
  .forEach(function (el) { el.addEventListener("input", scheduleAutosave); });

// ─── Navigation ────────────────────────────────────────────────

newNoteButton.addEventListener("click", function () {
  clearForm();
  editingId = null;
  showSection("create");
  setTimeout(function () { document.getElementById("title").focus(); }, 60);
});

savedNotesButton.addEventListener("click", function () {
  searchInput.value = "";
  showNotes();
  showSection("saved");
});

backToLibraryButton.addEventListener("click", function () {
  if (openNoteId) DraftManager.save(openNoteId);
  localStorage.removeItem("readora_open_note");
  showSection("saved");
});

cancelCreateButton.addEventListener("click", function () {
  if (editingId !== null) {
    const id = editingId;
    clearForm();
    editingId = null;
    openNote(id); // back to reader for the note being edited
  } else {
    clearForm();
    showSection("saved");
  }
});

searchInput.addEventListener("input", showNotes);

// ─── Tabs ──────────────────────────────────────────────────────

document.querySelectorAll(".tab-btn").forEach(function (button) {
  button.addEventListener("click", function () {
    document.querySelectorAll(".tab-btn").forEach(function (btn) { btn.classList.remove("active"); });
    document.querySelectorAll(".reader-page").forEach(function (page) { page.classList.remove("active-page"); });
    button.classList.add("active");
    document.getElementById(button.dataset.tab).classList.add("active-page");
  });
});

// ─── Theme ─────────────────────────────────────────────────────

function applyTheme() {
  const savedTheme = localStorage.getItem("readoraTheme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeButton.textContent = "☀️ Light Mode";
  } else {
    document.body.classList.remove("dark-mode");
    themeButton.textContent = "🌙 Dark Mode";
  }
}

themeButton.addEventListener("click", function () {
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("readoraTheme", isDark ? "light" : "dark");
  applyTheme();
});

// ─── Auth state handler ────────────────────────────────────────
// Supabase fires onAuthStateChange with these event types:
//   INITIAL_SESSION → page loaded with existing session  → restore position
//   SIGNED_IN       → user just logged in               → go to library
//   TOKEN_REFRESHED → background token refresh           → do NOTHING to navigation
//   USER_UPDATED    → profile changed                   → do NOTHING to navigation
//   SIGNED_OUT      → user logged out                   → reset everything
//
// Previous bug: we ignored the event type entirely, so TOKEN_REFRESHED
// (which fires every time you switch browser tabs back) was triggering
// showSection("saved") and kicking users back to the Library.

supabaseClient.auth.onAuthStateChange(async function (event, session) {
  if (!session) {
    // Signed out — full reset
    localStorage.removeItem("readora_section");
    localStorage.removeItem("readora_open_note");
    notes = [];
    showNotes();
    showFoldersInSidebar();
    return;
  }

  // Always silently refresh notes data in the background
  await loadNotes();

  // Only change navigation on actual session-start events
  if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
    const lastSection = localStorage.getItem("readora_section");
    const lastNoteId  = localStorage.getItem("readora_open_note");

    if (lastSection === "reader" && lastNoteId) {
      const noteExists = notes.find(function (n) { return n.id === lastNoteId; });
      if (noteExists) {
        openNote(lastNoteId); // restores reader + applies any local draft
      } else {
        localStorage.removeItem("readora_open_note");
        showSection("saved");
      }
    } else if (lastSection === "create") {
      showSection("create");
    } else {
      showSection("saved"); // default on first ever visit
    }
  }

  // TOKEN_REFRESHED, USER_UPDATED → notes refreshed above, navigation unchanged
});

applyTheme();

// ─── Revision Coach ────────────────────────────────────────────

const revisionCoachButton   = document.getElementById("revisionCoachButton");
const coachOverlay          = document.getElementById("coachOverlay");
const coachCloseButton      = document.getElementById("coachCloseButton");
const coachNoteName         = document.getElementById("coachNoteName");
const coachRecallInput      = document.getElementById("coachRecallInput");
const coachSubmitRecall     = document.getElementById("coachSubmitRecall");
const coachLoadingText      = document.getElementById("coachLoadingText");
const coachStrongSection    = document.getElementById("coachStrongSection");
const coachForgottenSection = document.getElementById("coachForgottenSection");
const coachMisconceptionSection = document.getElementById("coachMisconceptionSection");
const coachRebuildButton    = document.getElementById("coachRebuildButton");
const coachReconnectionContent = document.getElementById("coachReconnectionContent");
const coachCompleteSummary  = document.getElementById("coachCompleteSummary");
const coachPhase1 = document.getElementById("coachPhase1");
const coachPhase2 = document.getElementById("coachPhase2");
const coachPhase3 = document.getElementById("coachPhase3");
const coachPhase4 = document.getElementById("coachPhase4");
const coachPhase5 = document.getElementById("coachPhase5");

let coachGapData = null;

function showCoachPhase(num) {
  [coachPhase1, coachPhase2, coachPhase3, coachPhase4, coachPhase5]
    .forEach(function (p, i) { p.classList.toggle("hidden", i + 1 !== num); });
}

function getNoteContentForCoach() {
  if (!openNoteId) return "";
  const note = notes.find(function (n) { return n.id === openNoteId; });
  if (!note) return "";
  return [note.summary, note.takeaways, note.questions, note.examples, note.personalNotes]
    .filter(Boolean).join("\n\n");
}

function openRevisionCoach() {
  if (!openNoteId) return;
  const note = notes.find(function (n) { return n.id === openNoteId; });
  if (!note) return;

  const noteContent = getNoteContentForCoach();
  if (!noteContent.trim()) {
    alert("This note has no content yet.\nGenerate a Summary or Key Takeaways first, then come back to Revision Coach.");
    return;
  }

  coachNoteName.textContent = note.title || "Untitled Note";
  coachRecallInput.value = "";
  coachGapData = null;
  coachReconnectionContent.innerHTML = "";
  showCoachPhase(1);
  coachOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setTimeout(function () { coachRecallInput.focus(); }, 100);
}

function closeRevisionCoach() {
  coachOverlay.classList.add("hidden");
  document.body.style.overflow = "";
}

revisionCoachButton.addEventListener("click", openRevisionCoach);
coachCloseButton.addEventListener("click", closeRevisionCoach);
document.getElementById("coachCancelBtn").addEventListener("click", closeRevisionCoach);
document.getElementById("coachExitGapsBtn").addEventListener("click", closeRevisionCoach);
document.getElementById("coachFinishButton").addEventListener("click", closeRevisionCoach);

coachOverlay.addEventListener("click", function (e) {
  if (e.target === coachOverlay) closeRevisionCoach();
});

coachRecallInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && e.ctrlKey) { coachSubmitRecall.click(); }
});

// Phase 1 → Phase 3: Gap Analysis
coachSubmitRecall.addEventListener("click", async function () {
  const recall = coachRecallInput.value.trim();
  if (!recall) {
    alert("Please write what you remember before continuing.");
    return;
  }

  const noteContent = getNoteContentForCoach();
  showCoachPhase(2);
  coachLoadingText.textContent = "Comparing your recall to your notes...";
  coachSubmitRecall.disabled = true;

  try {
    const result = await callClaudeAPI({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: "You are a revision coach. Compare the student's free recall against the note content below. Output ONLY a valid JSON object with no markdown, no backticks, no explanation:\n{\"strong\":[\"things correctly remembered\"],\"forgotten\":[\"important things from notes NOT mentioned in recall\"],\"misconceptions\":[\"things the student stated incorrectly compared to notes\"]}\nMax 6 items per array. Keep each item under 10 words.",
      messages: [{ role: "user", content: "NOTE CONTENT:\n" + noteContent + "\n\nSTUDENT RECALL:\n" + recall }]
    });

    const raw  = result.content.map(function (b) { return b.text || ""; }).join("").trim();
    const clean = raw.replace(/```json|```/g, "").trim();
    coachGapData = JSON.parse(clean);

    renderGapAnalysis(coachGapData);
    showCoachPhase(3);

  } catch (err) {
    showCoachPhase(1);
    alert("Analysis failed — please try again.\n(" + err.message + ")");
  } finally {
    coachSubmitRecall.disabled = false;
  }
});

function renderGapAnalysis(gaps) {
  const strong         = gaps.strong         || [];
  const forgotten      = gaps.forgotten      || [];
  const misconceptions = gaps.misconceptions || [];

  if (strong.length > 0) {
    coachStrongSection.innerHTML =
      '<div class="coach-result-label coach-label-strong">Still with you (' + strong.length + ')</div>' +
      '<ul>' + strong.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul>";
    coachStrongSection.classList.remove("hidden");
  } else {
    coachStrongSection.classList.add("hidden");
  }

  if (forgotten.length > 0) {
    coachForgottenSection.innerHTML =
      '<div class="coach-result-label coach-label-forgotten">Needs rebuilding (' + forgotten.length + ')</div>' +
      '<ul>' + forgotten.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul>";
    coachForgottenSection.classList.remove("hidden");
  } else {
    coachForgottenSection.classList.add("hidden");
  }

  if (misconceptions.length > 0) {
    coachMisconceptionSection.innerHTML =
      '<div class="coach-result-label coach-label-misconception">Remembered incorrectly (' + misconceptions.length + ')</div>' +
      '<ul>' + misconceptions.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul>";
    coachMisconceptionSection.classList.remove("hidden");
  } else {
    coachMisconceptionSection.classList.add("hidden");
  }

  const totalGaps = forgotten.length + misconceptions.length;
  if (totalGaps === 0) {
    coachRebuildButton.textContent = "Perfect recall!";
    coachRebuildButton.disabled = true;
  } else {
    coachRebuildButton.textContent = "Rebuild " + totalGaps + " gap" + (totalGaps !== 1 ? "s" : "");
    coachRebuildButton.disabled = false;
  }
}

// Phase 3 → Phase 4: Reconnection
coachRebuildButton.addEventListener("click", async function () {
  if (!coachGapData) return;

  const allGaps = [...(coachGapData.forgotten || []), ...(coachGapData.misconceptions || [])];
  if (allGaps.length === 0) { showCoachPhase(5); return; }

  const noteContent = getNoteContentForCoach();
  showCoachPhase(2);
  coachLoadingText.textContent = "Rebuilding " + allGaps.length + " forgotten concept" + (allGaps.length !== 1 ? "s" : "") + "...";
  coachRebuildButton.disabled = true;

  try {
    const result = await callClaudeAPI({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: "You are a warm revision coach inside Readora AI. The student has already studied this material and once understood it. Help them RECONNECT with what they forgot — do NOT teach from scratch.\n\nFor each concept, use EXACTLY this format:\n\n**[Concept Name]**\nTrigger: [one sentence to jog their memory]\nMeaning: [clear explanation in 1-2 sentences]\nExample: [one concrete, relatable example]\n\nBe warm and concise. Assume prior exposure.",
      messages: [{ role: "user", content: "What the student forgot:\n" + allGaps.join("\n") + "\n\nFull note for context:\n" + noteContent }]
    });

    const text = result.content.map(function (b) { return b.text || ""; }).join("").trim();
    renderReconnection(text, allGaps.length);
    showCoachPhase(4);

  } catch (err) {
    showCoachPhase(3);
    alert("Reconnection failed — please try again.\n(" + err.message + ")");
  } finally {
    coachRebuildButton.disabled = false;
  }
});

function renderReconnection(text, gapCount) {
  const lines = text.split("\n");
  let html = "";
  let inCard = false;

  lines.forEach(function (line) {
    const t = line.trim();
    if (!t) return;

    if (t.startsWith("**") && t.endsWith("**")) {
      if (inCard) html += "</div>";
      html += '<div class="reconnect-card"><h4>' + t.replace(/\*\*/g, "") + "</h4>";
      inCard = true;
    } else if (t.startsWith("Trigger:")) {
      html += '<p class="reconnect-trigger"><strong>Memory trigger</strong> — ' + t.replace("Trigger:", "").trim() + "</p>";
    } else if (t.startsWith("Meaning:")) {
      html += '<p class="reconnect-meaning">' + t.replace("Meaning:", "").trim() + "</p>";
    } else if (t.startsWith("Example:")) {
      html += '<p class="reconnect-example"><strong>Example:</strong> ' + t.replace("Example:", "").trim() + "</p>";
    } else {
      const formatted = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      html += "<p>" + formatted + "</p>";
    }
  });

  if (inCard) html += "</div>";

  coachReconnectionContent.innerHTML = html;
}

// Phase 4 → Phase 5: Complete
document.getElementById("coachCompleteButton").addEventListener("click", function () {
  const strong    = (coachGapData && coachGapData.strong)         ? coachGapData.strong.length         : 0;
  const gaps      = ((coachGapData && coachGapData.forgotten)     ? coachGapData.forgotten.length     : 0) +
                    ((coachGapData && coachGapData.misconceptions) ? coachGapData.misconceptions.length : 0);

  coachCompleteSummary.textContent =
    "You remembered " + strong + " concept" + (strong !== 1 ? "s" : "") + " correctly and rebuilt " +
    gaps + " forgotten gap" + (gaps !== 1 ? "s" : "") + ". Your revision is complete.";

  showCoachPhase(5);
});