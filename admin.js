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
    select.innerHTML = scenarioListEl.innerHTML; // コピー
    select.value = currentScenario;

    const label = document.createElement("span");
    label.textContent = name + "：";

    select.addEventListener("change", async () => {
      await setDoc(docSnap.ref, {
        ...data,
        currentScenario: select.value
      }, { merge: true });
      showToast(`${name} をシナリオ ${select.value} に割り当てました`);
    });

    li.appendChild(label);
    li.appendChild(select);
    characterListEl.appendChild(li);
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadScenarios();
  await loadCharacters();
});
