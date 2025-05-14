import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Firebase初期化（あなたの設定に置き換えてください）
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 要素の取得
const scenarioIdInput = document.getElementById("scenario-id");
const loadScenarioButton = document.getElementById("load-scenario");
const scenarioNameSection = document.getElementById("scenario-name-section");
const currentScenarioName = document.getElementById("current-scenario-name");
const webhookSection = document.getElementById("webhook-section");
const webhookList = document.getElementById("webhook-list");
const saveWebhooksButton = document.getElementById("save-webhooks");
const characterSection = document.getElementById("character-section");
const characterList = document.getElementById("character-list");
const kpcSection = document.getElementById("kpc-section");
const kpcList = document.getElementById("kpc-list");
const addCharacterSection = document.getElementById("add-character-section");
const newCharacterName = document.getElementById("new-character-name");
const addCharacterButton = document.getElementById("add-character");
const toast = document.getElementById("toast");

let currentScenarioId = "";

// シナリオ読込
loadScenarioButton.addEventListener("click", async () => {
  const scenarioId = scenarioIdInput.value.trim();
  if (!scenarioId) return alert("シナリオIDを入力してください");

  const scenarioRef = doc(db, "scenarios", scenarioId);
  const scenarioSnap = await getDoc(scenarioRef);

  if (!scenarioSnap.exists()) {
    alert("そのシナリオは存在しません");
    return;
  }

  currentScenarioId = scenarioId;
  currentScenarioName.textContent = scenarioSnap.data().name || "名称未設定";

  scenarioNameSection.style.display = "block";
  webhookSection.style.display = "block";
  characterSection.style.display = "block";
  kpcSection.style.display = "block";
  addCharacterSection.style.display = "block";

  await loadWebhooks();
  await loadCharacters();
});

// Webhook情報の取得と表示
async function loadWebhooks() {
  webhookList.innerHTML = "";

  const webhookRef = doc(db, "scenarios", currentScenarioId);
  const webhookSnap = await getDoc(webhookRef);
  const data = webhookSnap.data();

  const keys = [
    "status",
    "kpc",
    "pl1",
    "pl2",
    "pl3",
    "pl4",
    "pl5",
    "pl6"
  ];

  keys.forEach(key => {
    const value = data?.webhooks?.[key] || "";
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <label>${key}：</label>
      <input type="text" data-key="${key}" value="${value}" style="width:80%">
    `;
    webhookList.appendChild(wrapper);
  });
}

// Webhook保存
saveWebhooksButton.addEventListener("click", async () => {
  const inputs = webhookList.querySelectorAll("input[data-key]");
  const webhooks = {};

  inputs.forEach(input => {
    const key = input.dataset.key;
    const value = input.value.trim();
    if (value) webhooks[key] = value;
  });

  const ref = doc(db, "scenarios", currentScenarioId);
  await updateDoc(ref, { webhooks });

  showToast("Webhookを保存しました");
});

// キャラ一覧取得
async function loadCharacters() {
  characterList.innerHTML = "";
  kpcList.innerHTML = "";

  const querySnapshot = await getDocs(
    collection(db, "scenarios", currentScenarioId, "characters")
  );

  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "character-box";
    div.innerHTML = `
      <strong>${data.name}</strong><br>
      HP: ${data.hp} / MP: ${data.mp}<br>
      種別: ${data.type}
    `;

    if (data.type === "pl") {
      characterList.appendChild(div);
    } else {
      kpcList.appendChild(div);
    }
  });
}

// キャラ追加
addCharacterButton.addEventListener("click", async () => {
  const name = newCharacterName.value.trim();
  if (!name) return;

  const id = crypto.randomUUID();
  const ref = doc(db, "scenarios", currentScenarioId, "characters", id);

  await setDoc(ref, {
    name,
    hp: 10,
    mp: 10,
    type: "pl"
  });

  newCharacterName.value = "";
  await loadCharacters();
  showToast("キャラを追加しました");
});

// トースト表示
function showToast(message) {
  toast.textContent = message;
  toast.style.display = "block";
  toast.style.opacity = "1";
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => {
      toast.style.display = "none";
    }, 500);
  }, 1500);
}
