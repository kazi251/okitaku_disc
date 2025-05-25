import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collectionGroup,
  query,
  where,
  getDocs,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast } from './utils.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// URLパラメータから scenarioId を取得
const urlParams = new URLSearchParams(window.location.search);
const scenarioId = urlParams.get("scenarioId");

const nameElem = document.getElementById("scenario-name");
const charListElem = document.getElementById("character-list");

const editModal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-form");
let currentDocRef = null;

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

// キャラクターの読み込み
async function fetchCharacters(scenarioId) {
  const charactersRef = collectionGroup(db, "list");
  const q = query(charactersRef, where("scenarioId", "==", scenarioId));
  const querySnapshot = await getDocs(q);

  const characters = [];

  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    characters.push({
      ...data,
      ref: docSnap.ref,
    });
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
      currentDocRef = char.ref;
      document.getElementById("edit-hp").value = char.hp ?? "";
      document.getElementById("edit-hpMax").value = char.hpMax ?? "";
      document.getElementById("edit-mp").value = char.mp ?? "";
      document.getElementById("edit-mpMax").value = char.mpMax ?? "";
      document.getElementById("edit-san").value = char.san ?? "";
      document.getElementById("edit-sanMax").value = char.sanMax ?? "";
      document.getElementById("edit-other").value = char.other ?? "";
      document.getElementById("edit-other2").value = char.other2 ?? "";

      // ラベル名
      document.getElementById("edit-other1-name").value = char.other1Name || "";
      document.getElementById("edit-other2-name").value = char.other2Name || "";

      // モーダル表示
      editModal.classList.remove("hidden");
      });

    container.appendChild(card);
  });
}

// モーダルのパラメータが空だった時の処理
function parseInputValue(id) {
  const val = document.getElementById(id).value;
  return val === "" ? null : Number(val);
}

function setupEventListeners() {

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentDocRef) return;

    const updatedData = {
      hp: parseInputValue("edit-hp"),
      hpMax: parseInputValue("edit-hpMax"),
      mp: parseInputValue("edit-mp"),
      mpMax: parseInputValue("edit-mpMax"),
      san: parseInputValue("edit-san"),
      sanMax: parseInputValue("edit-sanMax"),
      other: parseInputValue("edit-other"),
      other2: parseInputValue("edit-other2"),
      other1Name: document.getElementById("edit-other1-name").value.trim(),
      other2Name: document.getElementById("edit-other2-name").value.trim(),
    };

    try {
      await updateDoc(currentDocRef, updatedData);
      showToast("保存しました");
      editModal.classList.add("hidden");
      await initKpScenarioPage(); // 再読み込み
    } catch (err) {
      showToast("保存に失敗しました");
      console.error(err);
    }
  });

  document.getElementById("cancel-button").addEventListener("click", () => {
    editModal.classList.add("hidden");
  });

}

async function initKpScenarioPage() {
  
  await loadScenario();

  // キャラクター一覧取得と描画
  const characters = await fetchCharacters(scenarioId);
  renderCharacterCards(characters, charListElem);
  setupEventListeners();
}

window.addEventListener("DOMContentLoaded", () => {
  initKpScenarioPage();
});
