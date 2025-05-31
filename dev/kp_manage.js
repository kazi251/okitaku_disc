import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, setDoc, addDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast } from './utils.js';


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// URLパラメータから scenarioId を取得
const urlParams = new URLSearchParams(window.location.search);
const scenarioId = urlParams.get("scenarioId");
const accessKpId = urlParams.get("kpId");

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

  const characters = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const listElement = document.getElementById("kpc-list");
  listElement.innerHTML = "";
  renderCharacterList(listElement, characters, "kpc");
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

  const characters = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const listElement = document.getElementById("enemy-list");
  listElement.innerHTML = "";
  renderCharacterList(listElement, characters, "enemy");
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

  const characters = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const listElement = document.getElementById("mob-list");
  listElement.innerHTML = "";
  renderCharacterList(listElement, characters, "mobs");
}

async function saveCharacterFromForm(form, collectionName) {
  const id = form.id.value;
  const imageSrc = form.querySelector(".image-preview")?.src || "";
  const isDefaultImage = imageSrc.includes("./seeker_vault/default.png");

  const data = {
    name: form.name.value,
    display: form.display.checked,
    imageUrl: isDefaultImage ? undefined : imageSrc,
    palette: form.palette.value,
    hp: form.hp.value,
    hpMax: form.hpMax.value,
    mp: form.mpMax.value,
    mpMax: form.mpMax.value,
    san: form.san.value,
    sanMax: form.sanMax.value,
    other: form.other.value,
    other2: form.other2.value,
    other1Name: form.other1Name.value,
    other2Name: form.other2Name.value,
    memo: form.memo.value,
    updatedAt: new Date().toISOString(),
    accessKpId: accessKpId
  };

  if (id) {
    // IDがある場合 → 既存キャラの更新
    const ref = doc(db, "scenarios", scenarioId, collectionName, id);
    await setDoc(ref, data, { merge: true });
    showToast("キャラクターを更新しました！");
  } else {
    // IDがない場合 → 新規作成（IDはFirestore側が生成）
    const colRef = collection(db, "scenarios", scenarioId, collectionName);
    const docRef = await addDoc(colRef, data);
    showToast("キャラクターを新規作成しました！");
    form.id.value = docRef.id; // 保存後にIDセット
  }

  form.reset();
  form.querySelector(".image-preview").src = "./seeker_vault/default.png";
  await loadAll(); 
}

function renderCharacterList(listElement, characters, collectionName) {
  listElement.innerHTML = ""; // 一度リセット

  characters.forEach((char) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${char.name}
      <button class="edit-button" data-id="${char.id}" data-collection="${collectionName}">編集</button>
    `;
    listElement.appendChild(li);
  });

  listElement.querySelectorAll(".edit-button").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = btn.dataset.id;
      const collection = btn.dataset.collection;
      await loadCharacterToForm(id, collection); // 後述
    });
  });
}

// フォームに反映する関数
async function loadCharacterToForm(id, collectionName) {
  const ref = doc(db, `scenarios/${scenarioId}/${collectionName}/${id}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();

  document.getElementById("id").value = id;
  document.getElementById("name").value = data.name || "";
  document.getElementById("display").checked = data.display ?? true;
  document.getElementById("palette").value = data.palette || "";
  document.getElementById("hp").value = data.hp || "";
  document.getElementById("hpMax").value = data.hpMax || "";
  document.getElementById("mp").value = data.mp || "";
  document.getElementById("mpMax").value = data.mpMax || "";
  document.getElementById("san").value = data.san || "";
  document.getElementById("sanMax").value = data.sanMax || "";
  document.getElementById("other").value = data.other || "";
  document.getElementById("other2").value = data.other2 || "";
  document.getElementById("other1Name").value = data.other1Name || "";
  document.getElementById("other2Name").value = data.other2Name || "";
  document.getElementById("memo").value = data.memo || "";
  // 画像プレビュー
  const preview = document.querySelector("#image-preview");
  if (preview) {
    preview.src = data.imageUrl || "./seeker_vault/default.png";
  }

  // 選択されているコレクション名をセット（モブや敵でも再保存できるように）
  document.getElementById("collection-select").value = collectionName;
}

async function loadAll() {
  await loadKpcList();
  await loadEnemyList();
  await loadMobList();
}

// 一括読み込み
function initManagePage() {
  loadKpcList();
  loadEnemyList();
  loadMobList();

  document.getElementById("shared-char-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const typeSelect = document.getElementById("char-type");
    const collectionName = typeSelect.value; // "kpc", "enemies", "mobs"

    await saveCharacterFromForm(e.target, collectionName);
  });

}

// DOM読み込み後に初期化
window.addEventListener("DOMContentLoaded", initManagePage);
