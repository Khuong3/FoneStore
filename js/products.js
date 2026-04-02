import { db } from './config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const productList = document.getElementById('product-list');

async function showProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        
        if (querySnapshot.empty) {
            productList.innerHTML = "<div class='text-center'><p>Kho hàng hiện đang trống.</p></div>";
            return;
        }

        let htmlContent = '';

        querySnapshot.forEach((doc) => {
    const data = doc.data();
    htmlContent += `
    <div class="col-12 col-md-4 col-lg-3">
        <div class="product-card">
            <img src="${data.img}" class="product-img mb-3" onclick="goToDetail('${doc.id}')" style="cursor:pointer">
            <h5 class="fw-bold">${data.name}</h5>
            <p class="text-danger fw-bold">${Number(data.price).toLocaleString()}đ</p>
            
            <div class="d-grid gap-2">
                <button class="btn btn-success btn-sm" onclick="addToCart('${doc.id}', '${data.name}', ${data.price}, '${data.img}')">Thêm giỏ hàng</button>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-danger btn-sm w-50" onclick="addToWishlist('${doc.id}', '${data.name}', ${data.price}, '${data.img}')">❤️ Thích</button>
                    <button class="btn btn-outline-secondary btn-sm w-50" onclick="goToDetail('${doc.id}')">Chi tiết</button>
                </div>
            </div>
        </div>
    </div>
    `;
    // Thêm hàm điều hướng
window.goToDetail = (id) => {
    window.location.href = `./pages/product-detail.html?id=${id}`;
    };
});

        productList.innerHTML = htmlContent;

    } catch (error) {
        console.error("Lỗi lấy dữ liệu:", error);
        productList.innerHTML = "<p class='text-center text-danger'>Không thể kết nối với Firebase!</p>";
    }
}

showProducts();