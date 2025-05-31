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

async function saveCharacterFromForm(form, collectionName) {
  const id = form.id.value || crypto.randomUUID();
  const ref = doc(db, `scenarios/${scenarioId}/${collectionName}/${id}`);

  const imageSrc = form.querySelector(".image-preview")?.src || "";
  const isDefaultImage = imageSrc.includes("default.png");

  const data = {
    name: form.name.value,
    display: form.display.checked,
    imageUrl: isDefaultImage ? undefined : imageSrc,
    chatPalette: form.chatPalette.value,
    hp: form.hp.value,
    hpMax: form.hpMax.value,
    mp: form.mp.value,
    mpMax: form.mpMax.value,
    san: form.san.value,
    sanMax: form.sanMax.value,
    other: form.other.value,
    other2: form.other2.value,
    other1Name: form.other1Name.value,
    other2Name: form.other2Name.value,
    memo: form.memo.value,
    updatedAt: new Date().toISOString()
  };

  await setDoc(ref, data, { merge: true });
  showToast("KPCを保存しました！");
  form.reset();
  form.querySelector(".image-preview").src = "default.png";
  loadAll(); // 一覧再読み込み関数（後ほど定義）
}

// 一括読み込み
function initManagePage() {
  loadKpcList();
  loadEnemyList();
  loadMobList();

  document.getElementById("kpc-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await saveCharacterFromForm(e.target, "kpc");
  });

}

// DOM読み込み後に初期化
window.addEventListener("DOMContentLoaded", initManagePage);
