// admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, setDoc, getDoc,
  collectionGroup
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { showToast } from "./utils.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvrggu4aMoRwAG2rccnWQwhDGsS60Tl8Q",
  authDomain: "okitakudisc.firebaseapp.com",
  projectId: "okitakudisc",
  storageBucket: "okitakudisc.appspot.com",
  messagingSenderId: "724453796377",
  appId: "1:724453796377:web:bec78279dfc6dba0fc9888",
  measurementId: "G-LNHQBFYXFL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const scenarioListEl = document.getElementById("scenario-list");
const characterListEl = document.getElementById("character-list");

async function loadScenarios() {
  scenarioListEl.innerHTML = "";
  const snapshot = await getDocs(collection(db, "scenarios"));
  snapshot.forEach(docSnap => {
    const option = document.createElement("option");
    option.value = docSnap.id;
    option.textContent = docSnap.data().name || docSnap.id;
    scenarioListEl.appendChild(option);
  });
}

async function loadCharacters() {
  characterListEl.innerHTML = "";
  const snapshot = await getDocs(collectionGroup(db, "list"));

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const li = document.createElement("li");
    const name = data.name || "No Name";
    const currentScenario = data.currentScenario || "未割当";

    const select = document.createElement("select");
    select.innerHTML = scenarioListEl.innerHTML;
    select.value = currentScenario;

    const label = document.createElement("span");
    label.textContent = name + "：";

    // 🔧 イベントハンドラもループ内で設定する
    select.addEventListener("change", async () => {
      try {
        await setDoc(docSnap.ref, {
          ...data,
          currentScenario: select.value
        }, { merge: true });
        showToast(`${name} をシナリオ ${select.value} に割り当てました`);
      } catch (e) {
        console.error("割り当てエラー:", e);
        showToast("割り当てに失敗しました");
      }
    });

    li.appendChild(label);
    li.appendChild(select);
    characterListEl.appendChild(li);
  });
}

document.getElementById("create-scenario").addEventListener("click", async () => {
  const nameInput = document.getElementById("new-scenario-name");
  const scenarioName = nameInput.value.trim();
  if (!scenarioName) {
    showToast("シナリオ名を入力してください");
    return;
  }

  const newDocRef = doc(collection(db, "scenarios")); // 自動IDで追加
  await setDoc(newDocRef, {
    name: scenarioName,
    createdAt: new Date().toISOString()
  });

  showToast(`シナリオ「${scenarioName}」を作成しました`);
  nameInput.value = "";
  await loadScenarios(); // シナリオリストを再読み込み
});

