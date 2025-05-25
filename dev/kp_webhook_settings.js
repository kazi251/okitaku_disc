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
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast } from './utils.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const scenarioId = urlParams.get("scenarioId");
const kpId = urlParams.get("kpId");

const threadsColRef = collection(db, `scenarios/${scenarioId}/threads`);
const charactersColRef = collection(db, `characters`);

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
    li.textContent = thread.name;

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
        createdAt: Date.now()
      });
      await fetchThreads();
      showToast("スレッドをコピーしました");
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "削除";
    deleteBtn.onclick = async () => {
      await deleteDoc(doc(threadsColRef, thread.id));
      await fetchThreads();
    };

    li.append(" ", settingBtn, copyBtn, deleteBtn);
    threadList.appendChild(li);
    showToast("スレッドを削除しました");
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
  const charSnap = await getDocs(charactersColRef);
  characterSettingsBody.innerHTML = "";
  charSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.textContent = data.name ?? "(名前なし)";

    const saySel = document.createElement("select");
    threadListCache.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      if (data.sayWebhook === t.id) opt.selected = true;
      saySel.appendChild(opt);
    });

    const statusSel = document.createElement("select");
    threadListCache.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      if (data.statusWebhook === t.id) opt.selected = true;
      statusSel.appendChild(opt);
    });

    const sayTd = document.createElement("td");
    sayTd.appendChild(saySel);
    const statusTd = document.createElement("td");
    statusTd.appendChild(statusSel);

    tr.append(nameTd, sayTd, statusTd);
    characterSettingsBody.appendChild(tr);

    tr.dataset.charId = docSnap.id;
    tr._saySel = saySel;
    tr._statusSel = statusSel;
  });
}

saveSettingsButton.onclick = async () => {
  const trs = [...characterSettingsBody.querySelectorAll("tr")];
  for (const tr of trs) {
    const charId = tr.dataset.charId;
    const sayWebhook = tr._saySel.value;
    const statusWebhook = tr._statusSel.value;

    const charRef = doc(charactersColRef, charId);
    await setDoc(charRef, {
      sayWebhook,
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
  const url = document.getElementById("modal-webhook-url").value.trim();
  const threadIdPart = document.getElementById("modal-thread-id").value.trim();
  const fullUrl = threadIdPart ? `${url}?thread_id=${threadIdPart}` : url;

  if (!editingThreadId) return;

  const threadRef = doc(threadsColRef, editingThreadId);
  await setDoc(threadRef, { webhookUrl: fullUrl }, { merge: true });

  await fetchThreads();
  closeThreadModal();
  showToast("スレッド設定を保存しました");
};

document.getElementById("cancel-thread-settings-button").onclick = closeThreadModal;

fetchThreads();