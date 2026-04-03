import { auth, db } from './config.js';
// Thêm import Functions để gọi MoMo
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const functions = getFunctions();

// --- GIỮ NGUYÊN HÀM THÊM VÀO GIỎ HÀNG CỦA BẠN ---
window.addToCart = async function(productId, productName, productPrice, productImg) {
    const user = auth.currentUser;
    if (!user) {
        alert("Vui lòng đăng nhập để thực hiện chức năng này!");
        return;
    }

    try {
        const cartRef = doc(db, "carts", user.uid);
        const cartSnap = await getDoc(cartRef);
        
        let items = [];
        if (cartSnap.exists()) {
            items = cartSnap.data().items || [];
        }

        const existingItem = items.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            items.push({
                id: productId,
                name: productName,
                price: Number(productPrice),
                img: productImg,
                quantity: 1
            });
        }

        await setDoc(cartRef, { items: items });
        alert(`Đã thêm ${productName} vào giỏ hàng!`);
        updateCartIcon(); 
    } catch (error) {
        console.error("Lỗi thêm giỏ hàng:", error);
    }
};

// --- HÀM THANH TOÁN MOMO (BỔ SUNG MỚI) ---
window.checkoutMoMo = async function() {
    const user = auth.currentUser;
    if (!user) {
        alert("Vui lòng đăng nhập để thanh toán!");
        return;
    }

    try {
        const cartRef = doc(db, "carts", user.uid);
        const cartSnap = await getDoc(cartRef);
        
        if (!cartSnap.exists() || cartSnap.data().items.length === 0) {
            alert("Giỏ hàng của bạn đang trống!");
            return;
        }

        const items = cartSnap.data().items;
        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Gọi Cloud Function mà chúng ta vừa tạo
        const createMoMoPayment = httpsCallable(functions, 'createMoMoPayment');
        
        console.log("Đang tạo liên kết thanh toán...");
        const result = await createMoMoPayment({
            amount: totalAmount,
            orderInfo: `Thanh toán đơn hàng FStore - ${user.email}`,
            cartItems: items,
            userId: user.uid
        });

        if (result.data.success && result.data.payUrl) {
            // Chuyển hướng người dùng sang trang thanh toán của MoMo
            window.location.href = result.data.payUrl;
        } else {
            alert("Lỗi: " + (result.data.message || "Không thể tạo giao dịch."));
        }

    } catch (error) {
        console.error("Lỗi thanh toán MoMo:", error);
        alert("Đã xảy ra lỗi hệ thống khi thanh toán.");
    }
};

// --- HÀM CẬP NHẬT ICON (GIỮ NGUYÊN) ---
export async function updateCartIcon() {
    const user = auth.currentUser;
    const cartCountElement = document.querySelector('#cart-info a');
    if (!cartCountElement || !user) return;

    const cartRef = doc(db, "carts", user.uid);
    const cartSnap = await getDoc(cartRef);
    
    if (cartSnap.exists()) {
        const items = cartSnap.data().items || [];
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        cartCountElement.innerText = `Giỏ hàng (${totalItems})`;
    }
}