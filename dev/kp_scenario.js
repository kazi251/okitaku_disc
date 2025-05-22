// Firebase 初期化
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

const titleElem = document.getElementById("scenario-title");
const charListElem = document.getElementById("character-list");

async function loadScenario() {
  if (!scenarioId) {
    titleElem.textContent = "シナリオIDが指定されていません。";
    return;
  }

  // シナリオ情報を取得
  const scenarioDoc = await getDoc(doc(db, "scenarios", scenarioId));
  if (!scenarioDoc.exists()) {
    titleElem.textContent = "シナリオが見つかりません。";
    return;
  }

  const scenarioData = scenarioDoc.data();
  titleElem.textContent = `シナリオ：${scenarioData.title}`;

  // キャラクター一覧を取得
  await loadCharacters(scenarioId);
}

async function loadCharacters(scenarioId) {
  const charactersRef = collectionGroup(db, "list");
  const q = query(charactersRef, where("scenarioId", "==", scenarioId));

  const querySnapshot = await getDocs(q);
  charListElem.innerHTML = "";

  if (querySnapshot.empty) {
    charListElem.innerHTML = "<p>参加キャラクターがいません。</p>";
    return;
  }

  querySnapshot.forEach((docSnap) => {
    const char = docSnap.data();
    const li = document.createElement("li");
    li.textContent = char.name || "(名前なし)";
    charListElem.appendChild(li);
  });
}

// 初期化
loadScenario();
