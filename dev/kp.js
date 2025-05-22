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
const createButton = document.getElementById("create-scenario");

createButton.addEventListener("click", async () => {
  const input = document.getElementById("new-scenario-name");
  const title = input.value.trim();

  if (!title) {
    alert("シナリオ名を入力してください");
    return;
  }

  await addDoc(collection(db, "scenarios"), {
    title,
    kpId,
    createdAt: new Date()
  });

  input.value = "";
  loadScenarios();
});

async function loadScenarios() {
  const querySnapshot = await getDocs(collection(db, "scenarios"));
  scenarioListDiv.innerHTML = "";

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.kpId === kpId) {
      const div = document.createElement("div");
      div.style.marginBottom = "10px";
      div.innerHTML = `
        <strong>${data.name}</strong>
        <button onclick="location.href='kp_scenario.html?scenarioId=${docSnap.id}'">管理へ</button>
      `;
      scenarioListDiv.appendChild(div);
    }
  });
}

loadScenarios();