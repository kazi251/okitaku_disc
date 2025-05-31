import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast } from './utils.js';


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// URLパラメータから scenarioId を取得
const urlParams = new URLSearchParams(window.location.search);
const scenarioId = urlParams.get("scenarioId");

// FirestoreからKPC一覧を取得して表示
async function loadKpcList() {
  const snapshot = await getDocs(collection(db, `scenarios/${scenarioId}/kpc`));
  const container = document.getElementById("kpc-list");
  container.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.textContent = `・${data.name}`;
    container.appendChild(div);
  });
}

// エネミー一覧
async function loadEnemyList() {
  const snapshot = await getDocs(collection(db, `scenarios/${scenarioId}/enemies`));
  const container = document.getElementById("enemy-list");
  container.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.textContent = `・${data.name}`;
    container.appendChild(div);
  });
}

// モブ一覧
async function loadMobList() {
  const snapshot = await getDocs(collection(db, `scenarios/${scenarioId}/mobs`));
  const container = document.getElementById("mob-list");
  container.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.textContent = `・${data.name}`;
    container.appendChild(div);
  });
}

// 一括読み込み
function initManagePage() {
  loadKpcList();
  loadEnemyList();
  loadMobList();
}

// DOM読み込み後に初期化
window.addEventListener("DOMContentLoaded", initManagePage);
