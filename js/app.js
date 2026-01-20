
// --- Constants & Global State ---
const TARGET_SIZE = 320;
const DEFAULT_SOLID_COLOR = "#0000FF"; // Blue for Chroma Key
const DEFAULT_EXPRESSIONS = [
    { id: 'happy', label_zh: '開心', label_en: 'Happy', selected: true },
    { id: 'angry', label_zh: '生氣', label_en: 'Angry', selected: true },
    { id: 'sad', label_zh: '難過', label_en: 'Sad', selected: true },
    { id: 'surprise', label_zh: '驚訝', label_en: 'Surprised', selected: true },
    { id: 'love', label_zh: '愛心眼', label_en: 'Love eyes', selected: false },
    { id: 'confuse', label_zh: '困惑', label_en: 'Confused', selected: false },
    { id: 'scared', label_zh: '害怕', label_en: 'Scared', selected: false },
    { id: 'tired', label_zh: '累', label_en: 'Tired', selected: false },
];

const STATE = {
    apiKey: localStorage.getItem('gemini_api_key') || '',
    sourceImage: null, // { file, preview, base64Clean, originalName }
    expressions: [...DEFAULT_EXPRESSIONS],
    selectedStyles: ['cute_anime', 'handwritten_text'],
    ageOption: 'original', // original, elderly, kid, custom
    customAge: '30',
    solidColor: DEFAULT_SOLID_COLOR,
    results: [], // [{ id, label_zh, label_en, imageUrl, transparentUrl, status, fileName, transparentFileName }]
    isGenerating: false,
    abortController: null
};

// --- DOM Elements ---
const D = {
    apiKeyModal: document.getElementById('api-key-modal'),
    apiKeyInput: document.getElementById('api-key-input'),
    saveApiKeyBtn: document.getElementById('save-api-key-btn'),
    testApiKeyBtn: document.getElementById('test-api-key-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    apiKeyAlert: document.getElementById('api-key-alert'),
    alertSettingsBtn: document.getElementById('alert-settings-btn'),

    uploadArea: document.getElementById('upload-area'),
    fileInput: document.getElementById('file-input'),
    previewArea: document.getElementById('preview-area'),
    sourcePreview: document.getElementById('source-preview'),
    removeImageBtn: document.getElementById('remove-image-btn'),

    expressionsGrid: document.getElementById('expressions-grid'),
    customExpressionInput: document.getElementById('custom-expression-input'),
    addExpressionBtn: document.getElementById('add-expression-btn'),

    styleOptions: document.querySelectorAll('.style-option'),
    ageOptions: document.querySelectorAll('.age-option'),
    customAgeInput: document.getElementById('custom-age-input'),

    generateBtn: document.getElementById('generate-btn'),
    generateBtnText: document.getElementById('generate-btn-text'),
    stopBtn: document.getElementById('stop-btn'),
    resultsSection: document.getElementById('results-section'),
    resultsGrid: document.getElementById('results-grid'),
    progressContainer: document.getElementById('progress-container'),
    progressBar: document.getElementById('progress-bar'),
    progressCurrent: document.getElementById('progress-current'),
    progressTotal: document.getElementById('progress-total'),
    progressText: document.getElementById('progress-text'),

    downloadZipBtn: document.getElementById('download-zip-btn'),
    removeBgBtn: document.getElementById('remove-bg-btn'),
    downloadTransparentZipBtn: document.getElementById('download-transparent-zip-btn')
};

// --- Initialization ---
function init() {
    renderApiKeyStatus();
    renderExpressions();
    updateUIState();
    setupEventListeners();
}

// --- Event Listeners ---
function setupEventListeners() {
    // API Key
    D.saveApiKeyBtn.addEventListener('click', saveApiKey);
    D.testApiKeyBtn.addEventListener('click', testApiKey);
    D.settingsBtn.addEventListener('click', () => showApiKeyModal(true));
    D.alertSettingsBtn.addEventListener('click', () => showApiKeyModal(true));
    D.apiKeyModal.addEventListener('click', (e) => {
        if (e.target === D.apiKeyModal) showApiKeyModal(false);
    });

    // Upload
    D.uploadArea.addEventListener('click', () => D.fileInput.click());
    D.fileInput.addEventListener('change', handleFileUpload);
    D.removeImageBtn.addEventListener('click', removeSourceImage);

    // Drag & Drop
    D.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        D.uploadArea.classList.add('border-line', 'bg-green-50');
    });
    D.uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        D.uploadArea.classList.remove('border-line', 'bg-green-50');
    });
    D.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        D.uploadArea.classList.remove('border-line', 'bg-green-50');
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload({ target: { files: e.dataTransfer.files } });
        }
    });

    // Expressions
    D.addExpressionBtn.addEventListener('click', addCustomExpression);
    D.customExpressionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addCustomExpression();
    });

    // Styles
    D.styleOptions.forEach(opt => {
        opt.addEventListener('click', () => toggleStyle(opt.dataset.id));
    });

    // Age
    D.ageOptions.forEach(opt => {
        opt.addEventListener('click', () => selectAge(opt.dataset.id));
    });
    D.customAgeInput.addEventListener('input', (e) => {
        STATE.customAge = e.target.value;
    });

    // Generation
    D.generateBtn.addEventListener('click', startGeneration);
    D.stopBtn.addEventListener('click', stopGeneration);

    // Results
    D.removeBgBtn.addEventListener('click', handleBatchRemoveBackground);
    D.downloadZipBtn.addEventListener('click', () => downloadAllZip(false));
    D.downloadTransparentZipBtn.addEventListener('click', () => downloadAllZip(true));
}


// --- Logic: API Key ---
function showApiKeyModal(show) {
    if (show) {
        D.apiKeyInput.value = STATE.apiKey;
        D.apiKeyModal.classList.remove('hidden');
    } else {
        D.apiKeyModal.classList.add('hidden');
    }
}

function saveApiKey() {
    const key = D.apiKeyInput.value.trim();
    if (key) {
        STATE.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        showApiKeyModal(false);
        renderApiKeyStatus();
    }
}

async function testApiKey() {
    const key = D.apiKeyInput.value.trim();
    if (!key) {
        alert("請先輸入 API Key");
        return;
    }

    const btn = D.testApiKeyBtn;
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "驗證中...";
    btn.classList.add("opacity-75", "cursor-not-allowed");

    try {
        // Change to ListModels for generic key validation
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.error?.message || data.error?.status || "未知錯誤";
            throw new Error(`${errorMsg}`);
        }

        // Check if we have models
        if (!data.models || data.models.length === 0) {
            throw new Error("API Key 有效，但找不到任何可用模型 (API Error?)");
        }

        console.log("Available Models:", data.models.map(m => m.name));
        alert(`✅ API Key 驗證成功！\n可用模型數: ${data.models.length}`);

        // Auto save if success
        saveApiKey();

    } catch (e) {
        alert(`❌ 驗證失敗: ${e.message}`);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
        btn.classList.remove("opacity-75", "cursor-not-allowed");
    }
}

function renderApiKeyStatus() {
    if (!STATE.apiKey) {
        D.apiKeyAlert.classList.remove('hidden');
    } else {
        D.apiKeyAlert.classList.add('hidden');
    }
}


// --- Logic: Image Processing ---
async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        alert("僅支援 PNG, JPG, WEBP 格式");
        return;
    }

    try {
        const processed = await processImageTo320(file);
        STATE.sourceImage = {
            file,
            preview: processed.fullDataUrl,
            base64Clean: processed.base64Clean,
            originalName: file.name.split('.')[0]
        };
        STATE.results = []; // Reset results
        updateUIState();
    } catch (err) {
        console.error(err);
        alert("圖片處理失敗");
    }
}

function removeSourceImage() {
    STATE.sourceImage = null;
    STATE.results = [];
    D.fileInput.value = '';
    updateUIState();
}

const processImageTo320 = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = TARGET_SIZE;
                canvas.height = TARGET_SIZE;
                const ctx = canvas.getContext('2d');

                // Fill background white
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

                // Calculate scale (contain)
                const scale = Math.min(TARGET_SIZE / img.width, TARGET_SIZE / img.height);
                const x = (TARGET_SIZE - img.width * scale) / 2;
                const y = (TARGET_SIZE - img.height * scale) / 2;

                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                const dataUrl = canvas.toDataURL('image/png');
                resolve({
                    fullDataUrl: dataUrl,
                    base64Clean: dataUrl.split(',')[1]
                });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};


// --- Logic: Expressions UI ---
function renderExpressions() {
    D.expressionsGrid.innerHTML = '';
    STATE.expressions.forEach(ex => {
        const div = document.createElement('div');
        div.className = `expression-item relative flex items-center justify-between p-3 rounded-lg border cursor-pointer select-none transition-all ${ex.selected ? 'border-line bg-line-light text-green-800 shadow-md' : 'border-transparent bg-gray-50 text-gray-500 hover:bg-green-50'}`;
        div.onclick = () => toggleExpression(ex.id);

        div.innerHTML = `
            <span class="font-medium">${ex.label_zh}</span>
            <div class="flex items-center gap-1">
                ${ex.selected ? '<i data-lucide="check" size="16" class="text-line-dark"></i>' : ''}
                ${!['happy', 'angry', 'sad', 'surprise', 'love', 'confuse', 'scared', 'tired'].includes(ex.id) ?
                `<button class="delete-expr-btn text-gray-400 hover:text-red-500 p-1 rounded-full z-10" data-id="${ex.id}"><i data-lucide="x" size="14"></i></button>` : ''}
            </div>
        `;
        D.expressionsGrid.appendChild(div);
    });

    // Bind delete buttons
    document.querySelectorAll('.delete-expr-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeCustomExpression(btn.dataset.id);
        });
    });

    lucide.createIcons();
}

function toggleExpression(id) {
    const idx = STATE.expressions.findIndex(e => e.id === id);
    if (idx !== -1) {
        STATE.expressions[idx].selected = !STATE.expressions[idx].selected;
        renderExpressions();
    }
}

function addCustomExpression() {
    const val = D.customExpressionInput.value.trim();
    if (!val) return;

    STATE.expressions.push({
        id: `custom_${Date.now()}`,
        label_zh: val,
        label_en: null,
        selected: true
    });
    D.customExpressionInput.value = '';
    renderExpressions();
}

function removeCustomExpression(id) {
    STATE.expressions = STATE.expressions.filter(e => e.id !== id);
    renderExpressions();
}


// --- Logic: Styles & Age ---
function toggleStyle(id) {
    if (STATE.selectedStyles.includes(id)) {
        STATE.selectedStyles = STATE.selectedStyles.filter(s => s !== id);
    } else {
        STATE.selectedStyles.push(id);
    }
    updateStyleUI();
}

function updateStyleUI() {
    D.styleOptions.forEach(opt => {
        const id = opt.dataset.id;
        const icon = opt.querySelector('.checkbox');
        if (STATE.selectedStyles.includes(id)) {
            opt.classList.add('border-line', 'bg-line-light', 'text-green-800', 'shadow-md');
            opt.classList.remove('border-gray-200', 'bg-white', 'text-gray-500');
            icon.classList.remove('bg-white', 'border-gray-300');
            icon.classList.add('bg-line', 'border-line');
            icon.innerHTML = '<i data-lucide="check" size="14" class="text-white"></i>';
        } else {
            opt.classList.remove('border-line', 'bg-line-light', 'text-green-800', 'shadow-md');
            opt.classList.add('border-gray-200', 'bg-white', 'text-gray-500');
            icon.classList.add('bg-white', 'border-gray-300');
            icon.classList.remove('bg-line', 'border-line');
            icon.innerHTML = '';
        }
    });
    lucide.createIcons();
}

function selectAge(id) {
    STATE.ageOption = id;
    updateAgeUI();
}

function updateAgeUI() {
    D.ageOptions.forEach(opt => {
        const id = opt.dataset.id;
        const radio = opt.querySelector('.radio');
        const inner = radio.querySelector('div');

        if (STATE.ageOption === id) {
            opt.classList.add('border-line', 'bg-line-light', 'text-green-800', 'shadow-md');
            radio.classList.add('border-line');
            radio.classList.remove('border-gray-300');
            inner.classList.add('bg-line');
            inner.classList.remove('bg-transparent');
        } else {
            opt.classList.remove('border-line', 'bg-line-light', 'text-green-800', 'shadow-md');
            radio.classList.remove('border-line');
            radio.classList.add('border-gray-300');
            inner.classList.remove('bg-line');
            inner.classList.add('bg-transparent');
        }
    });
}


// --- Logic: Generation ---
async function startGeneration() {
    if (!STATE.apiKey) {
        showApiKeyModal(true);
        return;
    }
    if (!STATE.sourceImage) return;

    const selectedExprs = STATE.expressions.filter(e => e.selected);
    if (selectedExprs.length === 0) {
        alert("請至少選擇一個表情");
        return;
    }

    STATE.isGenerating = true;
    STATE.abortController = new AbortController();
    const signal = STATE.abortController.signal;
    updateUIState();

    // Setup results placeholders
    const nameCounts = {};
    STATE.results = selectedExprs.map(ex => {
        const rawBaseName = `${STATE.sourceImage.originalName}__${ex.label_zh}`;
        let uniqueBaseName = rawBaseName;
        if (nameCounts[rawBaseName] !== undefined) {
            nameCounts[rawBaseName]++;
            uniqueBaseName = `${rawBaseName}_${nameCounts[rawBaseName]}`;
        } else {
            nameCounts[rawBaseName] = 0;
        }

        return {
            id: ex.id,
            label_zh: ex.label_zh,
            label_en: ex.label_en,
            baseUniqueName: uniqueBaseName,
            status: 'pending',
            fileName: `${uniqueBaseName}.png`,
            transparentFileName: `${uniqueBaseName}_transparent.png`,
            imageUrl: null,
            transparentUrl: null
        };
    });
    renderResultsGrid();
    D.resultsSection.classList.remove('hidden');
    D.progressContainer.classList.remove('hidden');

    // Start Loop
    const total = STATE.results.length;
    D.progressTotal.innerText = total;

    for (let i = 0; i < total; i++) {
        if (signal.aborted) break;

        const item = STATE.results[i];

        // Update Status: Loading
        STATE.results[i].status = 'loading';
        renderResultItem(i);
        updateProgress(i, total, `正在生成: ${item.label_zh}`);

        try {
            // Translate if needed
            let promptEn = item.label_en;
            if (!promptEn) {
                promptEn = await translateExpression(item.label_zh);
            }

            // Generate Image
            const { imageUrl, fileNameSuffix } = await generateExpressionImage(
                STATE.sourceImage.base64Clean,
                promptEn,
                STATE.selectedStyles,
                { type: STATE.ageOption, value: STATE.customAge },
                STATE.solidColor
            );

            STATE.results[i].imageUrl = imageUrl;
            STATE.results[i].status = 'success';
            STATE.results[i].fileName = `${item.baseUniqueName}__${fileNameSuffix}.png`;

        } catch (e) {
            console.error(e);
            alert(`生成失敗: ${e.message} \n(請檢查 API Key 是否正確，或模型是否目前不可用)`);
            STATE.results[i].status = 'error';
        }

        renderResultItem(i);
    }

    STATE.isGenerating = false;
    updateUIState();
    updateProgress(total, total, "生成完成");
}

function stopGeneration() {
    if (STATE.abortController) {
        STATE.abortController.abort();
    }
    STATE.isGenerating = false;
    updateUIState();
}

function updateProgress(current, total, text) {
    D.progressCurrent.innerText = current;
    D.progressText.innerText = text;
    const pct = (current / total) * 100;
    D.progressBar.style.width = `${pct}%`;
}


// --- Logic: API Calls ---

async function translateExpression(text) {
    // Simple translation prompt
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${STATE.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Translate the following facial expression description from Traditional Chinese to English for an image generation prompt. Output ONLY the English keywords. Input: "${text}"` }] }]
            })
        });
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;
    } catch (e) {
        console.warn("Translation failed", e);
        return text;
    }
}

async function generateExpressionImage(base64Image, expressionEn, activeStyles, ageConfig, solidColor) {
    // 1. 先用 Gemini 2.0 Flash Exp 描述圖片 (確認在清單中)
    let charDescription = "A character";
    try {
        const descResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${STATE.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "Describe the visual appearance of this character in detail (hair style/color, eyes, skin tone, gender, outfit, accessories). Keep it concise but descriptive for image generation." },
                        { inlineData: { mimeType: "image/png", data: base64Image } }
                    ]
                }]
            })
        });
        const descData = await descResponse.json();
        charDescription = descData.candidates?.[0]?.content?.parts?.[0]?.text || "A character";
        console.log("Character Description:", charDescription);
    } catch (e) {
        console.warn("Description failed, using fallback.", e);
    }

    // 2. 建構 Imagen 的文字提示詞
    const isCute = activeStyles.includes('cute_anime');
    const hasText = activeStyles.includes('handwritten_text');
    const color = solidColor || DEFAULT_SOLID_COLOR;

    const stylePrompt = isCute
        ? "Art Style: Cute Anime / Chibi style. The character should look adorable and animated."
        : "Art Style: High quality 2D illustration.";

    let agePrompt = "";
    if (ageConfig.type === 'elderly') agePrompt = "Make the character look elderly (old age).";
    else if (ageConfig.type === 'kid') agePrompt = "Make the character look like a young child.";
    else if (ageConfig.type === 'custom') agePrompt = `Make the character look ${ageConfig.value} years old.`;

    const textPrompt = hasText
        ? "Include expressive English text bubbles suitable for the emotion."
        : "Do not include text.";

    const fullPrompt = `
        Generate a sticker of a character with this description: ${charDescription}.
        Expression: ${expressionEn}.
        ${agePrompt}
        ${stylePrompt}
        ${textPrompt}
        Background: Solid plain background color ${color}.
        Format: Die-cut sticker with a white border around the character. High quality, sharp lines.
    `;

    // 3. 多模型自動切換 (Auto-Failover Strategy)
    const endpoints = [
        // Strategy 0: Explicit Image Generation Model (v1beta) - 用戶清單中明確存在的模型
        { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${STATE.apiKey}`, name: "Gemini 2.0 Image Gen (v1beta)" },
        // Strategy A: Gemini 2.0 Flash Exp (v1alpha) - 開發者通道嘗試
        { url: `https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.0-flash-exp:generateContent?key=${STATE.apiKey}`, name: "Gemini 2.0 Exp (v1alpha)" },
        // Strategy B: Gemini 2.0 Flash Exp (v1beta) - 標準通道嘗試
        { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${STATE.apiKey}`, name: "Gemini 2.0 Exp (v1beta)" }
    ];

    let errors = [];
    let outputBase64 = null;

    for (const endpoint of endpoints) {
        console.log(`Trying image generation with: ${endpoint.name}`);
        try {
            const response = await fetch(endpoint.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }],
                    // generationConfig: { responseModalities: ['IMAGE'] }, // 暫時移除，避免 400 錯誤
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
                    ]
                })
            });

            const result = await response.json();

            if (!response.ok) {
                const errorMsg = result.error?.message || result.error?.status || JSON.stringify(result);
                console.warn(`${endpoint.name} failed: ${errorMsg}`);
                errors.push(`[${endpoint.name}] ${errorMsg}`);
                continue; // Try next endpoint
            }

            // 嘗試解析圖片
            outputBase64 = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

            if (outputBase64) {
                console.log(`Success with ${endpoint.name}`);
                break; // Success!
            } else {
                const reason = result.candidates?.[0]?.finishReason || "Unknown";
                console.warn(`${endpoint.name} returned structure but no image. Reason: ${reason}`);
                errors.push(`[${endpoint.name}] 無圖片資料 (${reason})`);
            }

        } catch (e) {
            console.warn(`${endpoint.name} exception:`, e);
            errors.push(`[${endpoint.name}] Exception: ${e.message}`);
        }
    }

    // 如果全部失敗
    if (!outputBase64) {
        console.error("All generation strategies failed.");

        // Check for Quota Exceeded and provide friendly message
        const allErrors = errors.join('\n');
        if (allErrors.includes('Quota exceeded') || allErrors.includes('429')) {
            throw new Error(`⚠️ Google AI 系統忙碌中 (配額額滿)\n建議處置：請等待約 1 分鐘後再重試。\n(錯誤代碼: Resource Exhausted / Quota Exceeded)`);
        }

        throw new Error(`所有模型嘗試皆失敗 (請檢查網路或 API Key 權限):\n${allErrors}`);
    }

    const fileNameSuffix = `solid-${color.replace('#', '')}`;
    return {
        imageUrl: `data:image/png;base64,${outputBase64}`,
        fileNameSuffix: fileNameSuffix
    };
}


// --- Logic: Output & Remove BG ---
function renderResultsGrid() {
    D.resultsGrid.innerHTML = '';
    STATE.results.forEach((_, idx) => {
        const div = document.createElement('div');
        div.id = `result-item-${idx}`;
        div.className = 'bg-gray-50 rounded-lg p-2 flex flex-col items-center gap-2 border border-gray-200 aspect-[3/4]';
        D.resultsGrid.appendChild(div);
        renderResultItem(idx);
    });
}

function renderResultItem(idx) {
    const item = STATE.results[idx];
    const el = document.getElementById(`result-item-${idx}`);
    if (!el) return;

    let content = '';

    if (item.status === 'pending') {
        content = `<div class="flex-1 flex items-center justify-center text-gray-400"><i data-lucide="clock" size="24"></i></div>`;
    } else if (item.status === 'loading') {
        content = `<div class="flex-1 flex items-center justify-center text-line animate-pulse"><i data-lucide="loader-2" size="24" class="animate-spin"></i></div>`;
    } else if (item.status === 'error') {
        content = `
            <div class="flex-1 flex flex-col items-center justify-center text-red-500 gap-1">
                <i data-lucide="alert-circle" size="24"></i>
                <span class="text-xs">失敗</span>
                <button onclick="retryItem(${idx})" class="mt-2 text-xs bg-white border border-gray-200 px-2 py-1 rounded shadow-sm hover:bg-gray-100">重試</button>
            </div>`;
    } else if (item.status === 'success') {
        const imgUrl = item.transparentUrl || item.imageUrl;
        const isTrans = !!item.transparentUrl;
        content = `
            <div class="relative w-full aspect-square rounded-md overflow-hidden border border-gray-200 bg-white ${isTrans ? 'checkerboard' : ''}">
                <img src="${imgUrl}" class="w-full h-full object-contain">
            </div>
            <div class="w-full flex justify-between items-center mt-auto pt-1">
                <span class="text-xs font-bold text-gray-700 truncate">${item.label_zh}</span>
                <button onclick="downloadSingle(${idx})" class="p-1 text-gray-500 hover:text-line hover:bg-green-50 rounded"><i data-lucide="download" size="14"></i></button>
            </div>
        `;
    }

    el.innerHTML = content;
    lucide.createIcons();
}

window.retryItem = async (idx) => {
    // Simple retry logic (simplified version of batch implementation)
    // In real app, consider refactoring startGeneration to support single item retries better
    const item = STATE.results[idx];
    STATE.results[idx].status = 'loading';
    renderResultItem(idx);

    try {
        let promptEn = item.label_en || await translateExpression(item.label_zh);
        const { imageUrl, fileNameSuffix } = await generateExpressionImage(
            STATE.sourceImage.base64Clean,
            promptEn,
            STATE.selectedStyles,
            { type: STATE.ageOption, value: STATE.customAge },
            STATE.solidColor
        );
        STATE.results[idx].imageUrl = imageUrl;
        STATE.results[idx].status = 'success';
    } catch (e) {
        STATE.results[idx].status = 'error';
    }
    renderResultItem(idx);
};

window.downloadSingle = (idx) => {
    const item = STATE.results[idx];
    const url = item.transparentUrl || item.imageUrl;
    const name = item.transparentUrl ? item.transparentFileName : item.fileName;

    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Flood Fill Remove Background
async function handleBatchRemoveBackground() {
    const successItems = STATE.results.map((r, i) => ({ r, i })).filter(x => x.r.status === 'success' && x.r.imageUrl);
    if (successItems.length === 0) return;

    updateProgress(0, successItems.length, "正在去背...");
    D.progressContainer.classList.remove('hidden');

    await Promise.all(successItems.map(async ({ r, i }) => {
        try {
            const transUrl = await removeSolidBackground(r.imageUrl);
            STATE.results[i].transparentUrl = transUrl;
            renderResultItem(i);
        } catch (e) {
            console.error(e);
        }
    }));

    updateUIState(); // Show transparent download button
    updateProgress(successItems.length, successItems.length, "去背完成");
}

const removeSolidBackground = (base64Image, tolerance = 20) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const width = canvas.width;
            const height = canvas.height;

            const bgR = data[0];
            const bgG = data[1];
            const bgB = data[2];

            const isMatch = (r, g, b) => {
                return Math.abs(r - bgR) <= tolerance &&
                    Math.abs(g - bgG) <= tolerance &&
                    Math.abs(b - bgB) <= tolerance;
            };

            const visited = new Uint8Array(width * height);
            const stack = [];
            const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];

            corners.forEach(([x, y]) => {
                const idx = (y * width + x) * 4;
                if (isMatch(data[idx], data[idx + 1], data[idx + 2])) {
                    stack.push([x, y]);
                    visited[y * width + x] = 1;
                }
            });

            while (stack.length > 0) {
                const [x, y] = stack.pop();
                const idx = (y * width + x) * 4;
                data[idx + 3] = 0;

                const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];

                for (const [nx, ny] of neighbors) {
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIdx = (ny * width + nx) * 4;
                        if (!visited[ny * width + nx] && data[nIdx + 3] !== 0) {
                            if (isMatch(data[nIdx], data[nIdx + 1], data[nIdx + 2])) {
                                visited[ny * width + nx] = 1;
                                stack.push([nx, ny]);
                            }
                        }
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = base64Image;
    });
};


// --- Logic: Utils ---

async function downloadAllZip(useTransparent) {
    const validResults = STATE.results.filter(r => r.status === 'success' && (useTransparent ? r.transparentUrl : r.imageUrl));
    if (validResults.length === 0) return;

    if (!window.JSZip) {
        alert("JSZip 尚未載入");
        return;
    }

    const zip = new JSZip();
    validResults.forEach(r => {
        const url = useTransparent ? r.transparentUrl : r.imageUrl;
        const name = useTransparent ? r.transparentFileName : r.fileName;
        zip.file(name, url.split(',')[1], { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${STATE.sourceImage.originalName}_表情包${useTransparent ? '_去背版' : ''}.zip`;
    link.click();
}


// --- Logic: UI Updates ---
function updateUIState() {
    // Update Upload Area
    if (STATE.sourceImage) {
        D.uploadArea.classList.add('hidden');
        D.previewArea.classList.remove('hidden');
        D.sourcePreview.src = STATE.sourceImage.preview;
    } else {
        D.uploadArea.classList.remove('hidden');
        D.previewArea.classList.add('hidden');
    }

    // Update Styles
    updateStyleUI();
    updateAgeUI();

    // Update Generate Button
    if (STATE.isGenerating) {
        D.generateBtn.classList.add('hidden');
        D.stopBtn.classList.remove('hidden');
        D.generateBtn.disabled = true;
    } else {
        D.generateBtn.classList.remove('hidden');
        D.stopBtn.classList.add('hidden');
        D.generateBtn.disabled = !STATE.sourceImage;
    }

    // Update Results Actions
    const hasSuccess = STATE.results.some(r => r.status === 'success');
    const hasTransparent = STATE.results.some(r => !!r.transparentUrl);

    if (hasSuccess) {
        D.downloadZipBtn.classList.remove('hidden');
        D.removeBgBtn.classList.remove('hidden');
    } else {
        D.downloadZipBtn.classList.add('hidden');
        D.removeBgBtn.classList.add('hidden');
    }

    if (hasTransparent) {
        D.downloadTransparentZipBtn.classList.remove('hidden');
    } else {
        D.downloadTransparentZipBtn.classList.add('hidden');
    }
}

// Start
init();
