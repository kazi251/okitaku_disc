window.addEventListener("DOMContentLoaded", () => {
  const banner = document.createElement("div");
  banner.textContent = "⚠ 開発環境です - Firebaseはdevプロジェクト";
  Object.assign(banner.style, {
    position: "fixed",
    top: 0,
    width: "100%",
    backgroundColor: "#f44336",
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    padding: "8px",
    zIndex: 9999,
    fontSize: "14px",
    fontFamily: "sans-serif"
  });
  document.body.appendChild(banner);
});
