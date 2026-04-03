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