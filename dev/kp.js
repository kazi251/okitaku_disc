import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs , query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast } from './utils.js';


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// KP IDチェック
const urlParams = new URLSearchParams(window.location.search);
const accessKpId = urlParams.get("kpId");

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
    accessKpId,
    createdAt: new Date().toISOString()
  });

  input.value = "";
  loadScenarios();
  showToast("シナリオを登録しました！");

}

async function loadScenarios() {
  const scenariosQuery = query(collection(db, "scenarios"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(scenariosQuery);
  scenarioListDiv.innerHTML = "";

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const scenarioId = docSnap.id;

    if (data.accessKpId === accessKpId) {
      const wrapper = document.createElement("div");
      wrapper.style.marginBottom = "16px";

      wrapper.innerHTML = `
        <strong>${data.name}</strong>
        <div class="scenario-meta">
          <small class="scenario-id">ID: ${scenarioId}</small>
          <button onclick="copyToClipboard('${scenarioId}')">コピー</button>
          <button onclick="location.href='kp_scenario.html?scenarioId=${scenarioId}&accessKpId=${accessKpId}'">管理へ</button>
        </div>
      `;
      scenarioListDiv.appendChild(wrapper);
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
