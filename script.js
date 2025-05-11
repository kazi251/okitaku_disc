import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { showToast } from './utils.js';

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

const urlParams = new URLSearchParams(window.location.search);
const playerId = urlParams.get("playerId") || "default";
let currentCharacterId = null;

function updateDisplay() {
    const sanMax = document.getElementById("san-max-input").value;
    document.getElementById("san-indef").textContent = Math.floor(sanMax * 0.8);

    const other1Name = document.getElementById("other1-name").value;
    const other2Name = document.getElementById("other2-name").value;

    document.getElementById("other1-label").textContent = other1Name || "その他";
    document.getElementById("other2-label").textContent = other2Name || "その他";
}

function updateChatPalette() {
    const chatPaletteInput = document.getElementById("chat-palette-input");
    if (!chatPaletteInput) return;
    window.chatPalette = chatPaletteInput.value.split('\n').filter(line => line.trim() !== '');
}

document.getElementById("chat-palette-input").addEventListener("input", updateChatPalette);

document.getElementById("dice-command").addEventListener("input", showSuggestions);

function showSuggestions() {
    const input = document.getElementById("dice-command").value.toLowerCase();
    const suggestions = document.getElementById("suggestions");
    suggestions.innerHTML = "";
    if (!input || !window.chatPalette) {
        suggestions.style.display = "none";
        return;
    }
    const matches = window.chatPalette.filter(line => line.toLowerCase().includes(input));
    if (matches.length === 0) {
        suggestions.style.display = "none";
        return;
    }
    matches.forEach(match => {
        const div = document.createElement("div");
        div.textContent = match;
        div.onclick = () => {
            document.getElementById("dice-command").value = match;
            suggestions.style.display = "none";
        };
        suggestions.appendChild(div);
    });
    suggestions.style.display = "block";
}

async function sendSay() {
    const content = document.getElementById("say-content").value.trim();
    if (!content) return;
    const avatarUrl = document.getElementById("explorer-image").src;
    try {
        const response = await fetch("https://sayworker.kai-chan-tsuru.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "探索者 太郎", message: content, avatar_url: avatarUrl })
        });
        if (response.ok) {
            document.getElementById("say-content").value = "";
            showToast("セリフを送信しました！");
        } else {
            const errorText = await response.text();
            throw new Error(`送信失敗: ${response.status} ${errorText}`);
        }
    } catch (error) {
        console.error(`セリフ送信エラー: ${error.message}`);
    }
}

async function rollDice() {
    const command = document.getElementById("dice-command").value.trim();
    if (!command) return;
    const userName = "探索者 太郎";
    const avatarUrl = document.getElementById("explorer-image").src;
    const workerUrl = new URL("https://rollworker.kai-chan-tsuru.workers.dev/");
    workerUrl.searchParams.append("command", command);
    workerUrl.searchParams.append("name", userName);
    workerUrl.searchParams.append("avatar_url", avatarUrl);
    try {
        const response = await fetch(workerUrl.toString());
        const result = await response.json();
        let displayText = `🎲 ${command}: `;
        if (result.ok) {
            displayText += result.text;
            showToast("ダイスを振りました！");
            if (result.text.includes("致命的失敗")) displayText += " 💀";
            else if (result.text.includes("失敗")) displayText += " 🥶";
            else if (result.text.includes("決定的成功/スペシャル")) displayText += " 🎉🎊✨";
            else if (result.text.includes("スペシャル") || result.text.includes("成功")) displayText += " 😊";
        } else {
            displayText += "エラー: " + result.reason;
        }
        document.getElementById("result").innerText = displayText;
    } catch (error) {
        document.getElementById("result").innerText = "⚠️ 通信エラーが発生しました";
        console.error("Fetch error:", error);
    }
}

async function loadCharacterList() {
  const snapshot = await getDocs(collection(db, "characters", playerId, "list"));
  const characterSelect = document.getElementById("character-select");
  characterSelect.innerHTML = "";
  snapshot.forEach(docSnap => {
    const opt = document.createElement("option");
    opt.value = docSnap.id;
    opt.textContent = docSnap.data().name;
    characterSelect.appendChild(opt);
  });
  if (characterSelect.options.length > 0) {
    currentCharacterId = characterSelect.options[0].value;
    await loadCharacterData(currentCharacterId);
  }
}

async function loadCharacterData(charId) {
  const ref = doc(db, "characters", playerId, "list", charId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  currentCharacterId = charId;
  const data = snap.data();
  document.getElementById("hp-input").value = data.hp || "";
  document.getElementById("hp-max-input").value = data.hpMax || "";
  document.getElementById("mp-input").value = data.mp || "";
  document.getElementById("mp-max-input").value = data.mpMax || "";
  document.getElementById("san-input").value = data.san || "";
  document.getElementById("san-max-input").value = data.sanMax || "";
  document.getElementById("other-input").value = data.other || "";
  document.getElementById("other2-input").value = data.other2 || "";
  document.getElementById("other1-name").value = data.other1Name || "";
  document.getElementById("other2-name").value = data.other2Name || "";
  document.getElementById("chat-palette-input").value = data.palette || "";
  updateDisplay();
  updateChatPalette();
  showToast("キャラクターを読み込みました！");
}

async function saveCharacterData() {
  if (!currentCharacterId) return;

  try {
    await setDoc(
      doc(db, "characters", playerId),
      { createdAt: new Date().toISOString() },
      { merge: true }
    );

    const ref = doc(db, "characters", playerId, "list", currentCharacterId);
    await setDoc(ref, {
      name: document.getElementById("character-select").selectedOptions[0].text,
      hp: document.getElementById("hp-input").value,
      hpMax: document.getElementById("hp-max-input").value,
      mp: document.getElementById("mp-input").value,
      mpMax: document.getElementById("mp-max-input").value,
      san: document.getElementById("san-input").value,
      sanMax: document.getElementById("san-max-input").value,
      other: document.getElementById("other-input").value,
      other2: document.getElementById("other2-input").value,
      other1Name: document.getElementById("other1-name").value,
      other2Name: document.getElementById("other2-name").value,
      palette: document.getElementById("chat-palette-input").value,
      updatedAt: new Date().toISOString()
    });

    showToast("キャラクターを保存しました！");
  } catch (error) {
    console.error("キャラクター保存失敗:", error);
    showToast("保存に失敗しました");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  // ボタンイベント
  document.getElementById("send-button").addEventListener("click", sendSay);
  document.getElementById("roll-button").addEventListener("click", rollDice);
  document.getElementById("save-button").addEventListener("click", saveCharacterData);
      document.getElementById("load-button").addEventListener("click", () => {
        if (currentCharacterId) {
            loadCharacterData(currentCharacterId);
        }
    });
  document.getElementById("new-character-button").addEventListener("click", async () => {
    const name = prompt("キャラクター名を入力してください");
    if (!name) return;
    try {
      const newChar = await addDoc(collection(db, "characters", playerId, "list"), {
        name,
        hp: "", hpMax: "", mp: "", mpMax: "", san: "", sanMax: "",
        other: "", other2: "", other1Name: "", other2Name: "",
        palette: "",
        updatedAt: new Date().toISOString()
      });
      showToast("キャラクターを作成しました");
      await loadCharacterList();
      document.getElementById("character-select").value = newChar.id;
      await loadCharacterData(newChar.id);
    } catch (e) {
      console.error("キャラ作成失敗:", e);
    }
  });

  document.getElementById("character-select").addEventListener("change", async () => {
    const selected = document.getElementById("character-select").value;
    if (selected) {
      await loadCharacterData(selected);
    }
  });

  // アコーディオン処理
  document.querySelectorAll(".toggle-button").forEach(button => {
    button.addEventListener("click", () => {
      const content = button.nextElementSibling;
      const isOpen = content.style.display === "block";
      content.style.display = isOpen ? "none" : "block";
      button.classList.toggle("open", !isOpen);
    });
  });

  // パラメータの反映
    [
        "hp-input", "hp-max-input", "mp-input", "mp-max-input",
        "san-input", "san-max-input", "other-input", "other2-input",
        "other1-name", "other2-name"
    ].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.addEventListener("input", updateDisplay);
    });

  updateDisplay();
  loadCharacterList();
});
