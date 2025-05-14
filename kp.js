// kp.js

document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");
  const toggleWebhookBtn = document.getElementById("toggle-webhook");
  const webhookSettings = document.getElementById("webhook-settings");
  const saveWebhooksBtn = document.getElementById("save-webhooks");

  // タブ切替
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((tab) => tab.classList.remove("active"));
      button.classList.add("active");
      const tabId = button.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");
    });
  });

  // Webhook設定トグル
  toggleWebhookBtn.addEventListener("click", () => {
    webhookSettings.style.display =
      webhookSettings.style.display === "none" ? "block" : "none";
  });

  // Webhook保存処理（仮実装）
  saveWebhooksBtn.addEventListener("click", () => {
    const webhooks = {
      pl1: document.getElementById("webhook-pl1").value,
      pl2: document.getElementById("webhook-pl2").value,
      pl3: document.getElementById("webhook-pl3").value,
      npc: document.getElementById("webhook-npc").value,
      status: document.getElementById("webhook-status").value,
    };
    console.log("保存されたWebhook設定:", webhooks);
    alert("Webhook設定を保存しました（実装予定）");
  });
});
