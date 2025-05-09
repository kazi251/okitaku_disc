import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

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

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// チャットパレットの保存処理
async function savePalette() {
  const paletteText = document.getElementById("chat-palette-input").value;
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

// チャットパレットの読み込み処理
async function loadPalette() {
  try {
    const docSnap = await getDoc(doc(db, "chat_palette_app", "default"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById("chat-palette-input").value = data.palette || "";
      showToast("チャットパレットを読み込みました！");
    }
  } catch (error) {
    console.error("読み込みに失敗しました:", error);
  }
}

// ステータス保存
async function saveStatus() {
  const hp = parseInt(document.getElementById("hp").value);
  const mp = parseInt(document.getElementById("mp").value);
  try {
    await setDoc(doc(db, "status", "taro"), { hp, mp, updatedAt: new Date().toISOString() });
    document.getElementById("hp-current").textContent = hp;
    document.getElementById("mp-current").textContent = mp;
    showToast("HP/MPを保存しました！");
  } catch (error) {
    console.error("HP/MP保存エラー:", error);
  }
}

// ステータス読み込み
async function loadStatus() {
  try {
    const docSnap = await getDoc(doc(db, "status", "taro"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById("hp").value = data.hp;
      document.getElementById("mp").value = data.mp;
      document.getElementById("hp-current").textContent = data.hp;
      document.getElementById("mp-current").textContent = data.mp;
      showToast("HP/MPを読み込みました！");
    }
  } catch (error) {
    console.error("HP/MP読み込みエラー:", error);
  }
}

// 通知表示用関数
function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = "#333";
    toast.style.color = "#fff";
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
    toast.style.fontSize = "14px";
    toast.style.zIndex = "1000";
    toast.style.opacity = "0";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.opacity = "1";
  toast.style.transition = "none";

  setTimeout(() => {
    toast.style.transition = "opacity 0.5s";
    toast.style.opacity = "0";
  }, 2000);
}

// ボタンイベントの設定
document.getElementById("save-button").addEventListener("click", savePalette);
document.getElementById("load-button").addEventListener("click", loadPalette);
document.getElementById("status-save-button").addEventListener("click", saveStatus);
document.getElementById("status-load-button").addEventListener("click", loadStatus);

// 自動読み込み
window.addEventListener("DOMContentLoaded", () => {
  loadPalette();
  loadStatus();
});
