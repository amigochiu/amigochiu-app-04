# LINE 貼圖產生器 - 部署與使用教學

這個 Web App 已經轉換為純 HTML5 架構，您可以直接在瀏覽器開啟，或部署到 GitHub Pages 讓手機使用。

## 📁 檔案結構
- `index.html`: 主網頁
- `js/app.js`: 核心邏輯
- `css/style.css`: 樣式表
- `manifest.json`: 手機 App 設定檔

## 🚀 如何在手機上使用 (GitHub Pages)

這是最推薦的方式，讓您的手機可以像安裝 App 一樣使用此工具。

1.  **上傳到 GitHub**:
    - 在 GitHub 建立一個新的 Repository (例如 `sticker-app`)。
    - 將此資料夾內的所有檔案上傳到該 Repository。

2.  **開啟 GitHub Pages**:
    - 進入 GitHub Repository 的 **Settings** > **Pages**。
    - 在 **Build and deployment** > **Source** 選擇 `Deploy from a branch`。
    - 在 **Branch** 選擇 `main` (或 `master`)，資料夾選擇 `/ (root)`。
    - 按下 **Save**。

3.  **手機安裝**:
    - 等待約 1-2 分鐘，重新整理頁面，您會看到網址 (例如 `https://yourname.github.io/sticker-app/`)。
    - 使用手機 Chrome (Android) 或 Safari (iOS) 開啟該網址。
    - **Android**: 點擊瀏覽器選單 >「加到主畫面」或「安裝應用程式」。
    - **iOS**: 點擊瀏覽器選單 >「加入主畫面」。
    - 現在您可以像開 App 一樣開啟它了！

## 🔑 API Key 設定
首次開啟時，系統會要求您輸入 **Google Gemini API Key**。
- Key 只會儲存在您的瀏覽器中，不會上傳到伺服器。
- 請確保您的 API Key 有權限存取 `gemini-2.5-flash-preview` 或相關模型。

## 🛠️ 本地開發
若要在電腦上測試，建議使用 VS Code 的 **Live Server** 套件，或是直接用瀏覽器開啟 `index.html` (部分功能可能會因瀏覽器安全性限制而受阻，建議還是架個簡易 Server)。
