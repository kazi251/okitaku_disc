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
    alert("チャットパレットを保存しました");
  } catch (error) {
    console.error("保存に失敗しました:", error);
    alert("保存に失敗しました");
  }
}

// チャットパレットの読み込み処理
async function loadPalette() {
  try {
    const docSnap = await getDoc(doc(db, "chat_palette_app", "default"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById("chat-palette-input").value = data.palette || "";
      alert("チャットパレットを読み込みました");
    } else {
      alert("保存されたチャットパレットが見つかりませんでした");
    }
  } catch (error) {
    console.error("読み込みに失敗しました:", error);
    alert("読み込みに失敗しました");
  }
}

// ステータス保存
async function saveStatus() {
  const hp = parseInt(document.getElementById("hp").value);
  const mp = parseInt(document.getElementById("mp").value);
  try {
    await setDoc(doc(db, "status", "taro"), { hp, mp, updatedAt: new Date().toISOString() });
    alert("HP/MPを保存しました");
  } catch (error) {
    console.error("HP/MP保存エラー:", error);
    alert("HP/MP保存に失敗しました");
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
    }
  } catch (error) {
    console.error("HP/MP読み込みエラー:", error);
    alert("HP/MP読み込みに失敗しました");
  }
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
