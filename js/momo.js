// js/momo.js
import axios from "https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js";  // hoặc dùng axios từ node_modules nếu dùng build

// ==================== THAY THÔNG TIN MO MO SANDBOX CỦA BẠN VÀO ĐÂY ====================
const PARTNER_CODE = "MOMOQFSH20250717_TEST";     // Ví dụ: MOMO1234567890
const ACCESS_KEY   = "m1rfCAFskm5T7ec6";
const SECRET_KEY   = "JSyZ4UGLYE5lEX1oZIOTJwVvTtVPz4G2";
// ===================================================================================

export async function payWithMoMoDirect(amount, orderInfo = "Test thanh toán FoneStore") {
    if (!amount || amount < 1000) {
        alert("Số tiền tối thiểu là 1.000 VNĐ");
        return;
    }

    const requestId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    const orderId = `TEST${Date.now()}`;

    // Tạo signature (bắt buộc theo MoMo)
    const rawSignature = `accessKey=${ACCESS_KEY}&amount=${amount}&extraData=&ipnUrl=http://localhost&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${PARTNER_CODE}&redirectUrl=http://localhost:5000/checkout-success.html&requestId=${requestId}&requestType=payWithMethod`;

    const signature = CryptoJS.HmacSHA256(rawSignature, SECRET_KEY).toString(CryptoJS.enc.Hex);

    const requestBody = {
        partnerCode: PARTNER_CODE,
        partnerName: "FoneStore",
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: "http://localhost:5000/checkout-success.html",   // thay bằng link thật khi test
        ipnUrl: "http://localhost",
        lang: "vi",
        extraData: "",
        requestType: "payWithMethod",
        signature: signature
    };

    try {
        console.log("Đang gọi MoMo Sandbox...");
        const response = await axios.post(
            "https://test-payment.momo.vn/v2/gateway/api/create",
            requestBody,
            { timeout: 15000 }
        );

        if (response.data && response.data.payUrl) {
            console.log("✅ PayURL:", response.data.payUrl);
            // Chuyển hướng sang trang thanh toán MoMo
            window.location.href = response.data.payUrl;
            return response.data;
        } else {
            alert("MoMo không trả về link thanh toán!");
        }
    } catch (error) {
        console.error("Lỗi gọi MoMo:", error.response ? error.response.data : error.message);
        alert("Không kết nối được với MoMo. Vui lòng kiểm tra thông tin Partner Code / Access Key / Secret Key.");
    }
}