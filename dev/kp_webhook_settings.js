// kp_webhook_settings.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  collectionGroup,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast } from './utils.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const scenarioId = urlParams.get("scenarioId");
const kpId = urlParams.get("kpId");

const threadsColRef = collection(db, `scenarios/${scenarioId}/threads`);

const characterSettingsContainer = document.getElementById("character-settings-container");

const newThreadNameInput = document.getElementById("new-thread-name");
const createThreadButton = document.getElementById("create-thread-button");
const threadList = document.getElementById("thread-list");
const characterSettingsBody = document.getElementById("character-settings-body");
const saveSettingsButton = document.getElementById("save-settings-button");

let threadListCache = []; // { id, name }
let editingThreadId = null;

if (!scenarioId || !kpId) {
  alert("URL に scenarioId と kpId を含めてください。");
  throw new Error("パラメータ不足");
}

async function fetchThreads() {
  const q = query(threadsColRef, orderBy("name"));
  const snap = await getDocs(q);
  threadListCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderThreadList();
  renderCharacterSettings();
}

function renderThreadList() {
  
  threadList.innerHTML = "";
  threadListCache.forEach(thread => {
    
    const li = document.createElement("li");
    
    const nameSpan = document.createElement("span");
    nameSpan.className = "thread-name";
    nameSpan.textContent = thread.name;

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "thread-buttons";

    const settingBtn = document.createElement("button");
    settingBtn.textContent = "設定"; 
    settingBtn.onclick = async () => openThreadModal(thread.id);

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "コピー";
    copyBtn.onclick = async () => {
      const newRef = doc(threadsColRef);
      await setDoc(newRef, {
        name: thread.name + "_copy",
        kpId,
        createdAt: Date.now(),
        webhookUrl: thread.webhookUrl ?? "",
        threadId: thread.threadId ?? ""
      });
      await fetchThreads();
      showToast("スレッドをコピーしました");
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "削除";
    deleteBtn.onclick = async () => {
      await deleteDoc(doc(threadsColRef, thread.id));
      await fetchThreads();
      showToast("スレッドを削除しました");
    };

    buttonContainer.append(settingBtn, copyBtn, deleteBtn);
    li.append(nameSpan, buttonContainer);
    threadList.appendChild(li);
  });
}

createThreadButton.onclick = async () => {
  const name = newThreadNameInput.value.trim();
  if (!name) return;
  const newRef = doc(threadsColRef);
  await setDoc(newRef, {
    name,
    kpId,
    createdAt: Date.now()
  });
  newThreadNameInput.value = "";
  await fetchThreads();
};

async function renderCharacterSettings() {
  const q = query(collectionGroup(db, "list"), where("kpId", "==", kpId));
  const charSnap = await getDocs(q);
  characterSettingsContainer.innerHTML = "";

  charSnap.forEach(docSnap => {
    const data = docSnap.data();
    const docPath = docSnap.ref.path;
    const sayWebhooks = data.sayWebhooks || [];
    const statusWebhook = data.statusWebhook || "";

    const details = document.createElement("details");
    details.className = "char-setting";

    const summary = document.createElement("summary");
    summary.textContent = data.name || "(名前なし)";
    details.appendChild(summary);

    const inner = document.createElement("div");
    inner.className = "char-settings-inner";

    // 発言先（チェックボックス）
    const sayGroup = document.createElement("div");
    sayGroup.className = "say-webhook-group";
    sayGroup.innerHTML = "<label>発言先（複数選択）:</label>";

    const checkboxContainer = document.createElement("div");
    checkboxContainer.className = "thread-checkboxes";
    threadListCache.forEach(t => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = t.id;
      if (sayWebhooks.includes(t.id)) checkbox.checked = true;
      label.appendChild(checkbox);
      label.append(" " + t.name);
      checkboxContainer.appendChild(label);
    });
    sayGroup.appendChild(checkboxContainer);

    // ステータス通知先（セレクト）
    const statusGroup = document.createElement("div");
    statusGroup.className = "status-webhook-group";
    statusGroup.innerHTML = "<label>ステータス通知先（1つ選択）:</label>";

    const select = document.createElement("select");
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "選択してください";
    select.appendChild(defaultOpt);

    threadListCache.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      if (t.id === statusWebhook) opt.selected = true;
      select.appendChild(opt);
    });
    statusGroup.appendChild(select);

    inner.append(sayGroup, statusGroup);
    details.appendChild(inner);
    characterSettingsContainer.appendChild(details);

    // 保存用にパスと入力参照保持
    details.dataset.charPath = docPath;
    details._checkboxes = [...checkboxContainer.querySelectorAll("input[type=checkbox]")];
    details._statusSelect = select;
  });
}

saveSettingsButton.onclick = async () => {
  const detailsList = [...characterSettingsContainer.querySelectorAll("details")];
  for (const d of detailsList) {
    const charRef = doc(db, d.dataset.charPath);
    const sayWebhooks = d._checkboxes.filter(cb => cb.checked).map(cb => cb.value);
    const statusWebhook = d._statusSelect.value;
    await setDoc(charRef, {
      sayWebhooks,
      statusWebhook,
      kpId
    }, { merge: true });
  }
  showToast("保存しました");
};

function openThreadModal(threadId) {
  const thread = threadListCache.find(t => t.id === threadId);
  if (!thread) return;

  editingThreadId = threadId;

  document.getElementById("modal-thread-name").value = thread.name || "";
  const fullUrl = thread.webhookUrl || "";
  const match = fullUrl.match(/^(https:\/\/[^?]+)(?:\?thread_id=(.+))?$/);
  document.getElementById("modal-webhook-url").value = match?.[1] || "";
  document.getElementById("modal-thread-id").value = match?.[2] || "";

  document.getElementById("thread-modal").classList.remove("hidden");
}

function closeThreadModal() {
  document.getElementById("thread-modal").classList.add("hidden");
  editingThreadId = null;
}

document.getElementById("save-thread-settings-button").onclick = async () => {
  const threadname = document.getElementById("modal-thread-name").value.trim();
  const url = document.getElementById("modal-webhook-url").value.trim();
  const threadIdPart = document.getElementById("modal-thread-id").value.trim();
  const fullUrl = threadIdPart ? `${url}?thread_id=${threadIdPart}` : url;

  if (!editingThreadId) return;

  const threadRef = doc(threadsColRef, editingThreadId);
  await setDoc(threadRef, { name: threadname, webhookUrl: fullUrl }, { merge: true });

  await fetchThreads();
  closeThreadModal();
  showToast("スレッド設定を保存しました");
};

document.getElementById("cancel-thread-settings-button").onclick = closeThreadModal;

fetchThreads();