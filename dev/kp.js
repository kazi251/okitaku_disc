import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast } from './utils.js';


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// KP IDチェック
const urlParams = new URLSearchParams(window.location.search);
const kpId = urlParams.get("kpId");

// UUID v4 形式をチェック
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(kpId)) {
  alert("無効なkpIdです。URLを確認してください。");
  throw new Error("Invalid kpId");
}

const scenarioListDiv = document.getElementById("scenario-list");

async function handleCreateScenario() {
  
  const input = document.getElementById("new-scenario-name");
  const name = input.value.trim();

  if (!name) {
    alert("シナリオ名を入力してください");
    return;
  }

  await addDoc(collection(db, "scenarios"), {
    name,
    kpId,
    createdAt: new Date().toISOString()
  });

  input.value = "";
  loadScenarios();
  showToast("シナリオを登録しました！");

}

async function loadScenarios() {
  const querySnapshot = await getDocs(collection(db, "scenarios"));
  scenarioListDiv.innerHTML = "";

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const scenarioId = docSnap.id;

    if (data.kpId === kpId) {
      const div = document.createElement("div");
      div.style.marginBottom = "16px";
      div.innerHTML = `
        <strong>${data.name}</strong><br>
        <small>ID: ${scenarioId}</small>
        <button onclick="copyToClipboard('${scenarioId}')">コピー</button>
        <button onclick="location.href='kp_scenario.html?scenarioId=${scenarioId}&kpId=${kpId}'">管理へ</button>
      `;
      scenarioListDiv.appendChild(div);
    }
  });
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      showToast("コピーしました！");
    })
    .catch((err) => {
      showToast("コピーに失敗しました: " + err);
    });
}
window.copyToClipboard = copyToClipboard;

function setupEventListeners() {
  document.getElementById("create-scenario").addEventListener("click", handleCreateScenario);
}

function initKpHomePage() {
  setupEventListeners();
  loadScenarios();
}

window.addEventListener("DOMContentLoaded", () => {
  initKpHomePage();
});
