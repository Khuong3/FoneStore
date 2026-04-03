import { db, auth } from './config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
// Import thêm Functions từ Firebase SDK
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";

const functions = getFunctions();
// Kết nối với hàm đã định nghĩa trong functions/index.js
const createMoMoPayment = httpsCallable(functions, 'createMoMoPayment');

export async function handlePaymentProcess() {
    const user = auth.currentUser;
    if (!user) {
        alert("Vui lòng đăng nhập để thực hiện thanh toán!");
        return;
    }

    try {
        // 1. Lấy thông tin từ Profile người dùng
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};

        // 2. Lấy thông tin từ Giỏ hàng (localStorage)
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        if (totalAmount <= 0) {
            alert("Giỏ hàng của bạn đang trống!");
            return;
        }

        // Tạo thông tin hiển thị trên hóa đơn MoMo
        const orderDescription = `FoneStore - Thanh toán đơn hàng cho ${userData.fullName || user.email}`;

        console.log("Đang khởi tạo giao dịch MoMo...");

        // 3. Gọi Cloud Function (Thay thế cho fetch POST giúp fix lỗi 405)
        const result = await createMoMoPayment({ 
            amount: totalAmount, 
            orderInfo: orderDescription
        });

        // 4. Xử lý kết quả trả về từ Cloud Function
        const data = result.data; 

        if (data.success && data.payUrl) {
            // Lưu tạm thông tin sản phẩm để trang thành công có thể truy xuất
            localStorage.setItem('temp_order_items', JSON.stringify(cart));
            
            // Chuyển hướng người dùng sang trang thanh toán của MoMo
            window.location.href = data.payUrl;
        } else {
            console.error("MoMo Error Details:", data);
            alert("Lỗi từ hệ thống MoMo: " + (data.message || "Không thể tạo mã thanh toán"));
        }

    } catch (error) {
        console.error("Lỗi quá trình thanh toán:", error);
        // Kiểm tra nếu lỗi do chưa deploy function hoặc sai tên function
        if (error.code === 'not-found') {
            alert("Lỗi: Server thanh toán chưa được kích hoạt (Function not found).");
        } else {
            alert("Lỗi kết nối server thanh toán! Vui lòng thử lại sau.");
        }
    }
}