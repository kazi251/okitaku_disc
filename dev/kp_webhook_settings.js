// kp_webhook_settings.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast } from './utils.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// シナリオIDはURLから取得（例: ?kpId=xxxx&scenarioId=yyyy）
const urlParams = new URLSearchParams(window.location.search);
const scenarioId = urlParams.get("scenarioId");
if (!scenarioId) {
  alert("シナリオIDが指定されていません。");
  throw new Error("シナリオIDが必要です。");
}

const threadsColRef = collection(db, `scenarios/${scenarioId}/webhookThreads`);
const charactersColRef = collection(db, `scenarios/${scenarioId}/characters`);

const newThreadNameInput = document.getElementById("new-thread-name");
const createThreadButton = document.getElementById("create-thread-button");
const threadList = document.getElementById("thread-list");
const characterSettingsBody = document.getElementById("character-settings-body");
const saveSettingsButton = document.getElementById("save-settings-button");

let threadListCache = []; // threadId, name

async function fetchThreads() {
  const snap = await getDocs(threadsColRef);
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
    // 実装予定: スレッド個別設定

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "コピー";
    copyBtn.onclick = async () => {
      await addDoc(threadsColRef, { name: thread.name + "_copy" });
      await fetchThreads();
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "削除";
    deleteBtn.onclick = async () => {
      await deleteDoc(doc(threadsColRef, thread.id));
      await fetchThreads();
    };

    li.append(" ", settingBtn, copyBtn, deleteBtn);
    threadList.appendChild(li);
  });
}

createThreadButton.onclick = async () => {
  const name = newThreadNameInput.value.trim();
  if (!name) return;
  await addDoc(threadsColRef, { name });
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

    // セレクトを記録用に tr に保持（保存時に使う）
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
    await updateDoc(charRef, { sayWebhook, statusWebhook });
  }
  alert("保存しました。");
};

// 初期読み込み
fetchThreads();