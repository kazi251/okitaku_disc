import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collectionGroup,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast } from './utils.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// URLパラメータから scenarioId を取得
const urlParams = new URLSearchParams(window.location.search);
const scenarioId = urlParams.get("scenarioId");

const nameElem = document.getElementById("scenario-name");
const charListElem = document.getElementById("character-list");

async function loadScenario() {
  if (!scenarioId) {
    nameElem.textContent = "シナリオIDが指定されていません。";
    return;
  }

  // シナリオ情報を取得
  const scenarioDoc = await getDoc(doc(db, "scenarios", scenarioId));
  if (!scenarioDoc.exists()) {
    nameElem.textContent = "シナリオが見つかりません。";
    return;
  }

  const scenarioData = scenarioDoc.data();
  nameElem.textContent = `シナリオ：${scenarioData.name}`;

}

async function fetchCharacters(scenarioId) {
  const charactersRef = collectionGroup(db, "list");
  const q = query(charactersRef, where("scenarioId", "==", scenarioId));
  const querySnapshot = await getDocs(q);

  const characters = [];

  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    characters.push(data);
  }

  return characters;
}

function renderCharacterCards(characters, container) {
  container.innerHTML = "";

  characters.forEach((char) => {
    const {
      name,
      hp, hpMax,
      mp, mpMax,
      san, sanMax,
      other, other1Name,
      other2, other2Name,
      imageUrl
    } = char;

    const sanBracket = sanMax - Math.floor(sanMax / 5);
    const displayImage = imageUrl || "./seeker_vault/default.png";

    const card = document.createElement("div");
    card.className = "character-card";

    card.innerHTML = `
      <div class="card-image">
        <img src="${displayImage}" alt="${name}">
      </div>
      <div class="card-info">
        <div class="card-stats">
          <div><strong>HP:</strong> ${hp}/${hpMax}</div>
          <div><strong>MP:</strong> ${mp}/${mpMax}</div>
          <div><strong>SAN:</strong> ${san}/${sanMax} (${sanBracket})</div>
          ${other1Name ? `<div><strong>${other1Name}:</strong> ${other}</div>` : ""}
          ${other2Name ? `<div><strong>${other2Name}:</strong> ${other2}</div>` : ""}
        </div>
        <div class="card-footer">
          <div class="card-name">${name}</div>
          <button class="edit-button">編集</button>
        </div>
      </div>
    `;

    // 編集ボタン処理（必要に応じてコールバック追加）
    card.querySelector(".edit-button").addEventListener("click", () => {
      // 編集モーダルなどを開く処理をここに
      alert(`${name} を編集します`);
    });

    container.appendChild(card);
  });
}

// function setupEventListeners() {
//   document.getElementById("create-scenario").addEventListener("click", handleCreateScenario);
// }

async function initKpScenarioPage() {
  
  await loadScenario();

  // キャラクター一覧取得と描画
  const characters = await fetchCharacters(scenarioId);
  renderCharacterCards(characters, charListElem);
}

window.addEventListener("DOMContentLoaded", () => {
  initKpScenarioPage();
});
