import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast } from './utils.js';


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ 仮のKP ID（認証機能をつける場合は後で変更）
const kpId = "dummy-kp-id";

const scenarioListDiv = document.getElementById("scenario-list");
const createButton = document.getElementById("create-scenario-button");

createButton.addEventListener("click", async () => {
  const input = document.getElementById("new-scenario-title");
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
        <strong>${data.title}</strong>
        <button onclick="location.href='kp_scenario.html?scenarioId=${docSnap.id}'">管理へ</button>
      `;
      scenarioListDiv.appendChild(div);
    }
  });
}

loadScenarios();