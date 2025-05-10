import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { showToast } from './utils.js';

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyBvrggu4aMoRwAG2rccnWQwhDGsS60Tl8Q",
  authDomain: "okitakudisc.firebaseapp.com",
  projectId: "okitakudisc",
  storageBucket: "okitakudisc.firebasestorage.app",
  messagingSenderId: "724453796377",
  appId: "1:724453796377:web:bec78279dfc6dba0fc9888",
  measurementId: "G-LNHQBFYXFL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sayButton = document.getElementById("send-button");
const diceCommandInput = document.getElementById("dice-command");
const rollButton = document.getElementById("roll-button");
const chatPaletteInput = document.getElementById("chat-palette-input");

sayButton.addEventListener("click", sendSay);
diceCommandInput.addEventListener("input", showSuggestions);
rollButton.addEventListener("click", rollDice);
document.getElementById("save-button").addEventListener("click", savePalette);
document.getElementById("load-button").addEventListener("click", () => loadPalette(updateChatPalette));
document.getElementById("legacy-status-save").addEventListener("click", saveStatus);
document.getElementById("legacy-status-load").addEventListener("click", loadStatus);

const paletteKey = "chatPalette";
let chatPalette = [];

window.updateChatPalette = function () {
  chatPalette = chatPaletteInput.value.split('\n').filter(line => line.trim() !== '');
};

function showSuggestions() {
  const input = diceCommandInput.value.toLowerCase();
  const suggestions = document.getElementById("suggestions");
  suggestions.innerHTML = "";
  if (!input) {
    suggestions.style.display = "none";
    return;
  }
  const matches = chatPalette.filter(line => line.toLowerCase().includes(input));
  if (matches.length === 0) {
    suggestions.style.display = "none";
    return;
  }
  matches.forEach(match => {
    const div = document.createElement("div");
    div.textContent = match;
    div.onclick = () => {
      diceCommandInput.value = match;
      suggestions.style.display = "none";
    };
    suggestions.appendChild(div);
  });
  suggestions.style.display = "block";
}

async function rollDice() {
  const command = diceCommandInput.value.trim();
  if (!command) return;
  const workerUrl = new URL("https://rollworker.kai-chan-tsuru.workers.dev/");
  workerUrl.searchParams.append("command", command);
  try {
    const response = await fetch(workerUrl.toString());
    const result = await response.json();
    let displayText = `🎲 ${command}: `;
    if (result.ok) {
      displayText += result.text;
      showToast("ダイスを振りました！");
      if (result.text.includes("致命的失敗")) displayText += " 💀";
      else if (result.text.includes("失敗")) displayText += " 😞";
      else if (result.text.includes("スペシャル") || result.text.includes("成功")) displayText += " 😊";
      else if (result.text.includes("決定的成功/スペシャル")) displayText += " 🎉🎊✨";
    } else {
      displayText += "エラー: " + result.reason;
    }
    document.getElementById("result").innerText = displayText;
  } catch (error) {
    document.getElementById("result").innerText = "⚠️ 通信エラーが発生しました";
    console.error("Fetch error:", error);
  }
}

async function sendSay() {
  const content = document.getElementById("say-content").value.trim();
  if (!content) return;
  try {
    const response = await fetch("https://sayworker.kai-chan-tsuru.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "探索者 太郎", message: content })
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

function updateDisplay() {
  const hp = document.getElementById("hp-input").value;
  const hpMax = document.getElementById("hp-max-input").value;
  const mp = document.getElementById("mp-input").value;
  const mpMax = document.getElementById("mp-max-input").value;
  const san = document.getElementById("san-input").value;
  const sanMax = document.getElementById("san-max-input").value;
  const other = document.getElementById("other-input").value;
  document.getElementById("hp").textContent = hp;
  document.getElementById("hp-max").textContent = hpMax;
  document.getElementById("mp").textContent = mp;
  document.getElementById("mp-max").textContent = mpMax;
  document.getElementById("san").textContent = san;
  document.getElementById("san-max").textContent = sanMax;
  document.getElementById("san-indef").textContent = Math.floor(sanMax * 0.8);
  document.getElementById("other").textContent = other || "-";
}

["hp-input", "hp-max-input", "mp-input", "mp-max-input", "san-input", "san-max-input", "other-input"].forEach(id => {
  const input = document.getElementById(id);
  if (input) input.addEventListener("input", updateDisplay);
});

async function savePalette() {
  const paletteText = chatPaletteInput.value;
  try {
    await setDoc(doc(db, "chat_palette_app", "default"), {
      palette: paletteText,
      updatedAt: new Date().toISOString()
    });
    showToast("チャットパレットを保存しました！");
  } catch (error) {
    console.error("保存に失敗しました:", error);
  }
}

async function loadPalette(callback) {
  try {
    const docSnap = await getDoc(doc(db, "chat_palette_app", "default"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      chatPaletteInput.value = data.palette || "";
      showToast("チャットパレットを読み込みました！");
      if (callback) callback();
    }
  } catch (error) {
    console.error("読み込みに失敗しました:", error);
  }
}

async function saveStatus() {
  try {
    await setDoc(doc(db, "character_status", "default"), {
      hp: document.getElementById("hp-input").value,
      hpMax: document.getElementById("hp-max-input").value,
      mp: document.getElementById("mp-input").value,
      mpMax: document.getElementById("mp-max-input").value,
      san: document.getElementById("san-input").value,
      sanMax: document.getElementById("san-max-input").value,
      other: document.getElementById("other-input").value,
      updatedAt: new Date().toISOString()
    });
    showToast("ステータスを保存しました");
  } catch (e) {
    console.error("保存失敗:", e);
    showToast("保存に失敗しました");
  }
}

async function loadStatus() {
  try {
    const snap = await getDoc(doc(db, "character_status", "default"));
    if (snap.exists()) {
      const data = snap.data();
      document.getElementById("hp-input").value = data.hp || "";
      document.getElementById("hp-max-input").value = data.hpMax || "";
      document.getElementById("mp-input").value = data.mp || "";
      document.getElementById("mp-max-input").value = data.mpMax || "";
      document.getElementById("san-input").value = data.san || "";
      document.getElementById("san-max-input").value = data.sanMax || "";
      document.getElementById("other-input").value = data.other || "";
      updateDisplay();
      showToast("ステータスを読み込みました");
    }
  } catch (e) {
    console.error("読み込み失敗:", e);
    showToast("読み込みに失敗しました");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadStatus();
  loadPalette(updateChatPalette);
  updateDisplay();
});
