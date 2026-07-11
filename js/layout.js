export async function loadLayout() {
    try {
        const headerContainer = document.getElementById("header-container");
        const footerContainer = document.getElementById("footer-container");

        if (headerContainer) {
            const headerRes = await fetch("/components/header.html");
            headerContainer.innerHTML = await headerRes.text();
        }

        if (footerContainer) {
            const footerRes = await fetch("/components/footer.html");
            footerContainer.innerHTML = await footerRes.text();
        }

        injectLayoutStyles();
        initHeaderSearch();
        initAIChatbox();
    } catch (error) {
        console.error("Lỗi load layout:", error);
    }
}

function injectLayoutStyles() {
    if (document.getElementById("dynamic-island-style")) return;

    const style = document.createElement("style");
    style.id = "dynamic-island-style";
    style.innerHTML = `
        .header-search-wrapper {
            min-width: 280px;
            max-width: 560px;
        }

        .dynamic-island-search {
            position: relative;
            width: 100%;
            max-width: 520px;
            height: 50px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.08);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-radius: 999px;
            display: flex;
            align-items: center;
            padding: 0 12px 0 16px;
            box-shadow: 
                0 8px 25px rgba(0,0,0,0.22),
                inset 0 1px 0 rgba(255,255,255,0.05);
            transition: all 0.28s ease;
            overflow: visible;
        }

        .dynamic-island-search:hover {
            transform: translateY(-1px);
            box-shadow: 
                0 12px 28px rgba(0,0,0,0.28),
                inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .dynamic-island-search:focus-within {
            width: 100%;
            max-width: 620px;
            background: rgba(255,255,255,0.12);
            border: 1px solid rgba(255,255,255,0.16);
            box-shadow: 
                0 16px 36px rgba(0,0,0,0.35),
                0 0 0 4px rgba(13,110,253,0.18);
            transform: translateY(-1px) scale(1.01);
        }

        .search-icon-left {
            color: rgba(255,255,255,0.72);
            font-size: 1rem;
            margin-right: 10px;
            flex-shrink: 0;
        }

        .search-input {
            flex: 1;
            height: 100%;
            background: transparent;
            border: none;
            outline: none;
            color: #fff;
            font-size: 0.95rem;
            padding-right: 10px;
        }

        .search-input::placeholder {
            color: rgba(255,255,255,0.55);
        }

        .search-btn {
            border: none;
            background: linear-gradient(135deg, #0d6efd, #4f8cff);
            color: white;
            font-size: 0.88rem;
            font-weight: 600;
            padding: 8px 16px;
            border-radius: 999px;
            transition: 0.25s ease;
            flex-shrink: 0;
        }

        .search-btn:hover {
            transform: scale(1.04);
            filter: brightness(1.05);
        }

        .search-suggestions {
            position: absolute;
            top: calc(100% + 10px);
            left: 0;
            right: 0;
            background: rgba(22, 22, 22, 0.96);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 22px;
            padding: 10px;
            box-shadow: 0 18px 40px rgba(0,0,0,0.35);
            z-index: 9999;
            max-height: 380px;
            overflow-y: auto;
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
        }

        .suggestion-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 12px;
            border-radius: 16px;
            cursor: pointer;
            transition: 0.22s ease;
            text-decoration: none;
            color: white;
        }

        .suggestion-item:hover {
            background: rgba(255,255,255,0.08);
            transform: translateX(2px);
        }

        .suggestion-item img {
            width: 46px;
            height: 46px;
            object-fit: cover;
            border-radius: 12px;
            background: white;
            padding: 4px;
        }

        .suggestion-name {
            font-weight: 600;
            font-size: 0.93rem;
            margin-bottom: 2px;
        }

        .suggestion-price {
            color: #ff6b6b;
            font-size: 0.87rem;
            font-weight: 700;
        }

        .suggestion-empty {
            padding: 14px;
            text-align: center;
            color: rgba(255,255,255,0.65);
            font-size: 0.9rem;
        }

        @media (max-width: 991px) {
            .header-search-wrapper {
                order: 3;
                width: 100%;
                max-width: 100%;
            }

            .dynamic-island-search {
                max-width: 100%;
            }

            .dynamic-island-search:focus-within {
                max-width: 100%;
                transform: none;
            }
        }

        @media (max-width: 576px) {
            .dynamic-island-search {
                height: 46px;
                padding: 0 10px 0 14px;
            }

            .search-btn {
                padding: 7px 13px;
                font-size: 0.82rem;
            }

            .search-input {
                font-size: 0.9rem;
            }
        }

        /* ── Floating AI Chatbox Styles ── */
        #ai-chatbox-wrapper {
            position: fixed;
            bottom: 25px;
            right: 25px;
            z-index: 999999;
            font-family: var(--font-main, 'Montserrat', sans-serif);
        }

        #ai-chatbox-toggle {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #8B5A2B, #3E2723);
            color: #ffffff;
            border: 1px solid rgba(255,255,255,0.15);
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #ai-chatbox-toggle:hover {
            transform: scale(1.1) rotate(5deg);
            box-shadow: 0 8px 24px rgba(62, 39, 35, 0.4);
        }

        #ai-chatbox-window {
            position: absolute;
            bottom: 70px;
            right: 0;
            width: 330px;
            height: 420px;
            border-radius: 12px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border: 1px solid rgba(0,0,0,0.08);
            box-shadow: 0 16px 48px rgba(0,0,0,0.18) !important;
            transition: all 0.3s ease;
        }

        .text-gold {
            color: #d4af37 !important;
        }

        .online-indicator {
            width: 6px;
            height: 6px;
            background-color: #2ec4b6;
            border-radius: 50%;
            display: inline-block;
            box-shadow: 0 0 8px #2ec4b6;
        }

        .message-bubble {
            max-width: 85%;
            padding: 8px 12px !important;
            border-radius: 12px;
            margin-bottom: 8px;
            word-wrap: break-word;
        }

        .message-bubble.assistant {
            background-color: #ffffff;
            color: #333333;
            align-self: flex-start;
            border-bottom-left-radius: 2px;
            border: 1px solid rgba(0,0,0,0.05);
        }

        .message-bubble.user {
            background-color: #e5d3c3;
            color: #3e2723;
            align-self: flex-end;
            margin-left: auto;
            border-bottom-right-radius: 2px;
        }

        /* Customize Scrollbar for AI Chatbox */
        #ai-chatbox-messages::-webkit-scrollbar {
            width: 5px;
        }
        #ai-chatbox-messages::-webkit-scrollbar-track {
            background: #f1f1f1;
        }
        #ai-chatbox-messages::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 10px;
        }
        #ai-chatbox-messages::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
        }
        
        .addon-link {
            color: #8B5A2B;
            text-decoration: underline;
            font-weight: 600;
        }
        
        .addon-link:hover {
            color: #3E2723;
        }
    `;
    document.head.appendChild(style);
}

function initHeaderSearch() {
    const form = document.getElementById("header-search-form");
    const input = document.getElementById("header-search-input");
    const suggestions = document.getElementById("header-search-suggestions");

    if (!form || !input || !suggestions) return;

    const cachedProducts =
        JSON.parse(localStorage.getItem("fonestore_products_all_cache") || "null")?.data || [];

    function renderSuggestions(keyword) {
        const q = keyword.trim().toLowerCase();

        if (!q) {
            suggestions.classList.add("d-none");
            suggestions.innerHTML = "";
            return;
        }

        const matched = cachedProducts
            .filter(p => (p.name || "").toLowerCase().includes(q))
            .slice(0, 6);

        if (!matched.length) {
            suggestions.innerHTML = `<div class="suggestion-empty">Không tìm thấy sản phẩm phù hợp</div>`;
            suggestions.classList.remove("d-none");
            return;
        }

        suggestions.innerHTML = matched.map(p => `
            <a class="suggestion-item" href="/pages/product-detail.html?id=${p.docId}">
                <img src="${p.img || 'https://via.placeholder.com/46'}" alt="${p.name || ''}">
                <div class="flex-grow-1">
                    <div class="suggestion-name">${p.name || 'Sản phẩm'}</div>
                    <div class="suggestion-price">${Number(p.price || 0).toLocaleString('vi-VN')}đ</div>
                </div>
                <i class="bi bi-arrow-up-right-circle text-secondary"></i>
            </a>
        `).join("");

        suggestions.classList.remove("d-none");
    }

    input.addEventListener("input", (e) => {
        renderSuggestions(e.target.value);
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const keyword = input.value.trim();

        if (!keyword) return;

        const currentPageHasProductList = typeof window.loadProductsByCategory === "function";

        if (currentPageHasProductList) {
            input.blur();
            suggestions.classList.add("d-none");

            const container = document.getElementById("product-list");
            const title = document.getElementById("category-title");

            if (title) title.innerText = `Kết quả tìm kiếm: ${keyword}`;

            const matched = cachedProducts.filter(p =>
                (p.name || "").toLowerCase().includes(keyword.toLowerCase())
            );

            if (container) {
                if (!matched.length) {
                    container.innerHTML = `
                        <div class="col-12 text-center py-5">
                            <i class="bi bi-search fs-1 text-muted"></i>
                            <h5 class="mt-3">Không tìm thấy sản phẩm phù hợp</h5>
                        </div>
                    `;
                } else {
                    container.innerHTML = matched.map(p => {
                        const isOutOfStock = (p.stock <= 0 || p.stock === undefined);

                        return `
                            <div class="col-md-3 mb-4">
                                <div class="card h-100 product-card shadow-sm">
                                    ${isOutOfStock ? '<span class="badge bg-secondary out-of-stock-label">HẾT HÀNG</span>' : ''}
                                    <a href="/pages/product-detail.html?id=${p.docId}">
                                        <img loading="lazy" src="${p.img}" class="card-img-top p-4 ${isOutOfStock ? 'img-out-of-stock' : ''}" style="height:200px; object-fit:contain">
                                    </a>
                                    <div class="card-body text-center">
                                        <h6 class="fw-bold">${p.name}</h6>
                                        <p class="text-danger fw-bold">${Number(p.price).toLocaleString()}đ</p>
                                        <div class="d-grid gap-2">
                                            <button class="btn ${isOutOfStock ? 'btn-secondary disabled' : 'btn-dark'} btn-sm" 
                                                ${isOutOfStock ? 'disabled' : `onclick="addToCart('${p.docId}', '${p.name}', ${p.price}, '${p.img}')"`}>
                                                ${isOutOfStock ? 'Tạm hết hàng' : 'Thêm vào giỏ'}
                                            </button>
                                            <button class="btn btn-outline-danger btn-sm" onclick="addToWishlist('${p.docId}', '${p.name}', ${p.price}, '${p.img}')">
                                                <i class="bi bi-heart"></i> Yêu thích
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join("");
                }
            }
        } else {
            window.location.href = `/index.html?search=${encodeURIComponent(keyword)}`;
        }
    });

    document.addEventListener("click", (e) => {
        if (!form.contains(e.target)) {
            suggestions.classList.add("d-none");
        }
    });

    input.addEventListener("focus", () => {
        if (input.value.trim()) {
            renderSuggestions(input.value);
        }
    });
}

function initAIChatbox() {
    if (document.getElementById("ai-chatbox-wrapper")) return;

    // Tạo container chatbox
    const chatboxWrapper = document.createElement("div");
    chatboxWrapper.id = "ai-chatbox-wrapper";
    chatboxWrapper.innerHTML = `
        <button id="ai-chatbox-toggle" class="btn shadow-lg d-flex align-items-center justify-content-center" style="border:none">
            <i class="bi bi-chat-dots-fill fs-4"></i>
            <span class="badge bg-danger ms-1 d-none" id="ai-chat-badge">1</span>
        </button>

        <div id="ai-chatbox-window" class="card shadow-lg d-none border-0">
            <div class="card-header bg-dark text-white d-flex align-items-center justify-content-between py-2 border-0" style="border-radius: 12px 12px 0 0;">
                <div class="d-flex align-items-center">
                    <i class="bi bi-robot fs-4 text-warning me-2 animate-bounce"></i>
                    <div>
                        <h6 class="mb-0 fw-bold small text-gold" style="font-size:12px">FoneStore AI Assistant</h6>
                        <span class="text-success small-subtext d-flex align-items-center" style="font-size: 10px;">
                            <span class="online-indicator me-1"></span>Trực tuyến
                        </span>
                    </div>
                </div>
                <button class="btn btn-close btn-close-white btn-sm border-0" id="ai-chatbox-close" style="font-size:9px"></button>
            </div>

            <div class="card-body bg-light" id="ai-chatbox-messages" style="height: 290px; overflow-y: auto; font-size: 13px; line-height: 1.4; display: flex; flex-direction: column; padding: 12px;">
                <div class="message-bubble assistant shadow-sm">
                    Chào bạn! Mình là Trợ lý AI của FoneStore ☕. Mình có thể giúp gì cho bạn hôm nay? Bạn cần tư vấn hạt cà phê, máy pha hay hướng dẫn đặt hàng?
                </div>
            </div>

            <div class="card-footer bg-white p-2 border-top border-light">
                <div class="input-group input-group-sm">
                    <input type="text" id="ai-chatbox-input" class="form-control border-light" placeholder="Nhập câu hỏi tại đây..." style="font-size: 13px; box-shadow: none;">
                    <button class="btn btn-dark px-3" id="ai-chatbox-send" style="border-radius: 0 4px 4px 0;"><i class="bi bi-send-fill"></i></button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(chatboxWrapper);

    const toggleBtn = document.getElementById("ai-chatbox-toggle");
    const chatWindow = document.getElementById("ai-chatbox-window");
    const closeBtn = document.getElementById("ai-chatbox-close");
    const sendBtn = document.getElementById("ai-chatbox-send");
    const chatInput = document.getElementById("ai-chatbox-input");
    const messagesArea = document.getElementById("ai-chatbox-messages");
    const badge = document.getElementById("ai-chat-badge");

    let chatMessages = [];
    // Groq API - miễn phí, key vĩnh viễn tại console.groq.com
    const GROQ_API_KEY = "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";
    const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
    const GROQ_MODEL   = "llama-3.3-70b-versatile";

    function getProductsContext() {
        try {
            const cached = localStorage.getItem("fonestore_products_all_cache");
            if (!cached) return "Hiện tại không có danh sách sản phẩm nào khả dụng.";
            
            const parsed = JSON.parse(cached);
            const productsList = parsed.data || [];
            
            if (productsList.length === 0) return "Cửa hàng đang cập nhật sản phẩm, hiện tại chưa có hàng.";
            
            let text = "Dưới đây là danh sách sản phẩm hiện có trong store của chúng tôi. Hãy chỉ gợi ý và giới thiệu các sản phẩm này:\n";
            productsList.forEach(p => {
                text += `- Tên: ${p.name}, Giá: ${Number(p.price).toLocaleString('vi-VN')}đ, Tồn kho: ${p.stock || 0}, Mô tả: ${p.desc || p.description || ''}, Xem chi tiết link: /pages/product-detail.html?id=${p.docId}\n`;
            });
            return text;
        } catch (e) {
            console.error("Lỗi trích xuất context sản phẩm:", e);
            return "Không thể nạp danh sách sản phẩm.";
        }
    }

    // System prompt cho Groq
    function buildSystemPrompt() {
        return `Bạn là Trợ lý AI tư vấn và hướng dẫn mua hàng thân thiện của cửa hàng Coffee & Accessories FoneStore.
Nhiệm vụ của bạn là:
1. Tư vấn các sản phẩm cà phê, máy pha, phin pha, sữa đặc, phụ kiện,... có trong danh sách sản phẩm của cửa hàng.
2. Hướng dẫn khách hàng mua hàng (Thêm vào giỏ, thanh toán qua MoMo).
3. LUÔN LUÔN đính kèm link dạng [Tên sản phẩm](url) khi giới thiệu sản phẩm.
4. Chỉ giới thiệu sản phẩm có trong danh sách sau:
${getProductsContext()}
5. Trả lời ngắn gọn, nhiệt tình bằng Tiếng Việt.`;
    }

    function formatMarkdown(text) {
        if (!text) return "";
        let html = text;
        html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="addon-link">$1</a>');
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/^\*\s+(.+)$/gm, '<li>$1</li>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    function renderMessage(text, role) {
        const bubble = document.createElement("div");
        bubble.className = `message-bubble ${role === "user" ? "user" : "assistant"} shadow-sm`;
        bubble.innerHTML = role === "user" ? text : formatMarkdown(text);
        messagesArea.appendChild(bubble);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function loadChatHistory() {
        try {
            const stored = sessionStorage.getItem("fonestore_ai_chat_messages");
            if (stored) {
                chatMessages = JSON.parse(stored);
                chatMessages.forEach(msg => {
                    renderMessage(msg.text, msg.role);
                });
            }
        } catch (e) {
            console.error("Lỗi nạp lịch sử chat:", e);
        }
    }

    function saveChatHistory() {
        try {
            sessionStorage.setItem("fonestore_ai_chat_messages", JSON.stringify(chatMessages));
        } catch (e) {
            console.error("Lỗi lưu lịch sử chat:", e);
        }
    }

    function showLoadingBubble() {
        const bubble = document.createElement("div");
        bubble.className = "message-bubble assistant loading shadow-sm";
        bubble.innerHTML = '<span class="spinner-grow spinner-grow-sm me-1" role="status"></span> Đang trả lời...';
        messagesArea.appendChild(bubble);
        messagesArea.scrollTop = messagesArea.scrollHeight;
        return bubble;
    }

    function removeLoadingBubble(bubble) {
        if (bubble && bubble.parentNode) {
            bubble.parentNode.removeChild(bubble);
        }
    }

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        
        chatInput.value = "";
        chatMessages.push({ role: "user", text: text });
        renderMessage(text, "user");
        saveChatHistory();

        const loadingBubble = showLoadingBubble();

        try {
            // Xây dựng messages theo format OpenAI (Groq tương thích hoàn toàn)
            const messages = [
                { role: "system", content: buildSystemPrompt() },
                ...chatMessages.map(msg => ({
                    role: msg.role === "model" ? "assistant" : "user",
                    content: msg.text
                }))
            ];

            const response = await fetch(GROQ_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: GROQ_MODEL,
                    messages: messages,
                    max_tokens: 1024,
                    temperature: 0.7
                })
            });

            removeLoadingBubble(loadingBubble);

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                const errDetail = errBody?.error?.message || response.statusText;
                console.error("Groq API Error:", errDetail);
                throw new Error(errDetail);
            }

            const resData = await response.json();
            const aiText = resData.choices?.[0]?.message?.content || "Xin lỗi, mình gặp lỗi khi xử lý.";

            chatMessages.push({ role: "model", text: aiText });
            renderMessage(aiText, "model");
            saveChatHistory();
        } catch (err) {
            console.error("Lỗi chatbox:", err);
            removeLoadingBubble(loadingBubble);
            const rawMsg = err?.message || String(err) || "Unknown error";
            renderMessage(`⚠️ Lỗi: ${rawMsg}`, "model");
        }
    }

    toggleBtn.addEventListener("click", () => {
        chatWindow.classList.toggle("d-none");
        badge.classList.add("d-none");
        messagesArea.scrollTop = messagesArea.scrollHeight;
    });

    closeBtn.addEventListener("click", () => {
        chatWindow.classList.add("d-none");
    });

    sendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    // Dọn dẹp lịch sử khi nhấn Thoát (logout-btn)
    document.addEventListener("click", (e) => {
        if (e.target && (e.target.id === "logout-btn" || e.target.closest("#logout-btn"))) {
            sessionStorage.removeItem("fonestore_ai_chat_messages");
        }
    });

    loadChatHistory();
}