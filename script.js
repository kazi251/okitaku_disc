import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { showToast } from './utils.js';

// Firebase設定
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

const sayButton = document.getElementById("send-button");
const diceCommandInput = document.getElementById("dice-command");
const rollButton = document.getElementById("roll-button");
const chatPaletteInput = document.getElementById("chat-palette-input");

const paletteKey = "chatPalette";
let chatPalette = [];

sayButton.addEventListener("click", sendSay);
diceCommandInput.addEventListener("input", showSuggestions);
rollButton.addEventListener("click", rollDice);
document.getElementById("save-button").addEventListener("click", savePalette);
document.getElementById("load-button").addEventListener("click", () => loadPalette(updateChatPalette, false));
document.getElementById("legacy-status-save").addEventListener("click", saveStatus);
document.getElementById("legacy-status-load").addEventListener("click", () => loadStatus(false));

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
    const userName = "探索者 太郎";
    const workerUrl = new URL("https://rollworker.kai-chan-tsuru.workers.dev/");
    workerUrl.searchParams.append("command", command);
    workerUrl.searchParams.append("name", userName);
    const avatarUrl = document.getElementById("explorer-image").src;
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

function updateDisplay() {
    const sanMax = document.getElementById("san-max-input").value;
    document.getElementById("san-indef").textContent = Math.floor(sanMax * 0.8);

    const other1Name = document.getElementById("other1-name").value;
    const other2Name = document.getElementById("other2-name").value;

    document.getElementById("other1-label").textContent = other1Name || "その他";
    document.getElementById("other2-label").textContent = other2Name || "その他";
}

["hp-input", "hp-max-input", "mp-input", "mp-max-input", "san-input", "san-max-input", "other-input", "other2-input","other1-name", "other2-name"].forEach(id => {
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

async function loadPalette(callback, silent = false) {
    try {
        const docSnap = await getDoc(doc(db, "chat_palette_app", "default"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            chatPaletteInput.value = data.palette || "";
            if (!silent) showToast("チャットパレットを読み込みました！");
            if (callback) callback();
        }
    } catch (error) {
        console.error("読み込みに失敗しました:", error);
    }
}

async function saveStatus() {
    const hp = document.getElementById("hp-input").value;
    const hpMax = document.getElementById("hp-max-input").value;
    const mp = document.getElementById("mp-input").value;
    const mpMax = document.getElementById("mp-max-input").value;
    const san = document.getElementById("san-input").value;
    const sanMax = document.getElementById("san-max-input").value;
    const other = document.getElementById("other-input").value;
    const other2 = document.getElementById("other2-input").value;
    const other1Name = document.getElementById("other1-name").value;
    const other2Name = document.getElementById("other2-name").value;

    try {
        await setDoc(doc(db, "character_status", "default"), {
            hp, hpMax, mp, mpMax, san, sanMax, other, other2 , other1Name, other2Name,
            updatedAt: new Date().toISOString()
        });

        document.getElementById("hp").textContent = hp;
        document.getElementById("hp-max").textContent = hpMax;
        document.getElementById("mp").textContent = mp;
        document.getElementById("mp-max").textContent = mpMax;
        document.getElementById("san").textContent = san;
        document.getElementById("san-max").textContent = sanMax;
        document.getElementById("san-indef").textContent = Math.floor(sanMax * 0.8);
        document.getElementById("other").textContent = other || "-";
        document.getElementById("other2").textContent = other2 || "-";
        document.getElementById("other1-label").textContent = other1Name || "その他";
        document.getElementById("other2-label").textContent = other2Name || "その他";

        showToast("ステータスを保存しました");
    } catch (e) {
        console.error("保存失敗:", e);
        showToast("保存に失敗しました");
    }

    // Discord通知
    const message =
        `ステータス更新\n` +
        `\`\`\`\n` +
        `HP: ${hp} / ${hpMax}\n` +
        `MP: ${mp} / ${mpMax}\n` +
        `SAN: ${san} / ${sanMax}（不定: ${Math.floor(sanMax * 0.8)}）\n` +
        `${other1Name || "その他1"}: ${other || "-"}\n` +
        `${other2Name || "その他2"}: ${other2 || "-"}` +
        `\`\`\``;
    
    const avatarUrl = document.getElementById("explorer-image").src;
    try {
        await fetch("https://sayworker.kai-chan-tsuru.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "探索者 太郎", message, avatar_url: avatarUrl })
        });
    } catch (error) {
        console.error("Discord通知失敗:", error);
    }
}

async function loadStatus(silent = false) {
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
            document.getElementById("other2-input").value = data.other2 || "";
            document.getElementById("other1-name").value = data.other1Name || "";
            document.getElementById("other2-name").value = data.other2Name || "";

            document.getElementById("hp").textContent = data.hp || "";
            document.getElementById("hp-max").textContent = data.hpMax || "";
            document.getElementById("mp").textContent = data.mp || "";
            document.getElementById("mp-max").textContent = data.mpMax || "";
            document.getElementById("san").textContent = data.san || "";
            document.getElementById("san-max").textContent = data.sanMax || "";
            document.getElementById("san-indef").textContent = Math.floor((data.sanMax || 0) * 0.8);
            document.getElementById("other").textContent = data.other || "-";
            document.getElementById("other2").textContent = data.other2 || "-";
            document.getElementById("other1-label").textContent = data.other1Name || "その他";
            document.getElementById("other2-label").textContent = data.other2Name || "その他";

            updateDisplay();
            if (!silent) showToast("ステータスを読み込みました");
        }
    } catch (e) {
        console.error("読み込み失敗:", e);
        showToast("読み込みに失敗しました");
    }
}

window.addEventListener("DOMContentLoaded", () => {
    loadStatus(true); // silent モード
    loadPalette(updateChatPalette, true); // silent モード
    updateDisplay();
});

document.querySelectorAll(".toggle-button").forEach(button => {
    button.addEventListener("click", () => {
        const content = button.nextElementSibling;
        const isOpen = content.style.display === "block";
        content.style.display = isOpen ? "none" : "block";
        button.classList.toggle("open", !isOpen);
    });
});

// プレイヤーID（URLクエリから取得）
const urlParams = new URLSearchParams(window.location.search);
const playerId = urlParams.get("playerId") || "default";
let currentCharacterId = null;

const characterSelect = document.getElementById("character-select");
const newCharacterButton = document.getElementById("new-character-button");

newCharacterButton.addEventListener("click", async () => {
  const name = prompt("キャラクター名を入力してください");
  if (!name) return;
  try {
    const newChar = await addDoc(collection(db, "characters", playerId, "list"), {
      name,
      hp: "10",
      hpMax: "10",
      mp: "5",
      mpMax: "5",
      san: "50",
      sanMax: "50",
      palette: "",
      other: "",
      other1Name: "",
      other2Name: "",
      updatedAt: new Date().toISOString()
    });
    showToast("キャラクターを作成しました");
    await loadCharacterList();
    characterSelect.value = newChar.id;
    await loadCharacterData(newChar.id);
  } catch (e) {
    console.error("キャラ作成失敗:", e);
  }
});

characterSelect.addEventListener("change", async () => {
  const selected = characterSelect.value;
  if (selected) {
    await loadCharacterData(selected);
  }
});

async function loadCharacterList() {
  const snapshot = await getDocs(collection(db, "characters", playerId, "list"));
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
  document.getElementById("other1-name").value = data.other1Name || "";
  document.getElementById("other2-name").value = data.other2Name || "";
  document.getElementById("chat-palette-input").value = data.palette || "";
  updateDisplay();
  updateChatPalette();
  showToast("キャラクターを読み込みました！");
}

async function saveCharacterData() {
  if (!currentCharacterId) return;
  const ref = doc(db, "characters", playerId, "list", currentCharacterId);
  await setDoc(ref, {
    name: characterSelect.options[characterSelect.selectedIndex].text,
    hp: document.getElementById("hp-input").value,
    hpMax: document.getElementById("hp-max-input").value,
    mp: document.getElementById("mp-input").value,
    mpMax: document.getElementById("mp-max-input").value,
    san: document.getElementById("san-input").value,
    sanMax: document.getElementById("san-max-input").value,
    other: document.getElementById("other-input").value,
    other1Name: document.getElementById("other1-name").value,
    other2Name: document.getElementById("other2-name").value,
    palette: document.getElementById("chat-palette-input").value,
    updatedAt: new Date().toISOString()
  });
  showToast("キャラクターを保存しました！");
}

window.addEventListener("DOMContentLoaded", loadCharacterList);
window.saveCharacterData = saveCharacterData;