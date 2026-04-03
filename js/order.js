import { db, auth } from './config.js';
import { doc, getDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Hàm xử lý khi nhấn nút "Thanh toán MoMo"
export async function handlePaymentProcess() {
    const user = auth.currentUser;
    if (!user) return alert("Vui lòng đăng nhập!");

    // 1. Lấy thông tin từ Profile
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();

    // 2. Lấy thông tin từ Giỏ hàng (giả sử bạn lưu trong localStorage)
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (totalAmount <= 0) return alert("Giỏ hàng trống!");

    const orderId = "FS_" + Date.now();
    const userInfo = {
        uid: user.uid,
        fullName: userData.fullName,
        phone: userData.phone,
        address: `${userData.homeAddress}, ${userData.ward}, ${userData.district}, ${userData.province}`
    };

    // 3. Gọi Backend tạo link MoMo
    try {
        const response = await fetch('https://fonestore.pages.dev/create-payment', { // Thử dùng IP thay vì localhost
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json'
    },  
    body: JSON.stringify({ 
        amount: totalAmount, 
        orderId: orderId,
        userInfo: userInfo
            })
        });

        const data = await response.json();
        if (data.payUrl) {
            // Lưu tạm thông tin sản phẩm để dùng sau khi quay lại
            localStorage.setItem('temp_order_items', JSON.stringify(cart));
            window.location.href = data.payUrl;
        }
    } catch (error) {
        alert("Lỗi kết nối server thanh toán!");
    }
}