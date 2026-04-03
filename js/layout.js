export async function loadComponent(selector, filePath) {
    const element = document.querySelector(selector);
    if (!element) return;

    try {
        const res = await fetch(filePath);
        const html = await res.text();
        element.innerHTML = html;
    } catch (error) {
        console.error(`Không thể tải component: ${filePath}`, error);
    }
}

export async function loadLayout() {
    await loadComponent("#header-container", "/components/header.html");
    await loadComponent("#footer-container", "/components/footer.html");
}