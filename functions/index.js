const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");

admin.initializeApp();

// ==================== THÔNG TIN MOMO SANDBOX ====================
const PARTNER_CODE = "MOMOQFSH20250717_TEST"; 
const ACCESS_KEY   = "m1rfCAFskm5T7ec6";
const SECRET_KEY   = "JSyZ4UGLYE5lEX1oZIOTJwVvTtVPz4G2";

// QUAN TRỌNG: Sửa lại domain Cloudflare của bạn ở đây
const REDIRECT_URL = "https://fonestore.pages.dev/pages/checkout-success.html"; 
const IPN_URL      = "https://fonestore.pages.dev/momo-notification"; 
// ================================================================

exports.createMoMoPayment = functions.https.onCall(async (data, context) => {
    // 1. Kiểm tra đăng nhập
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Vui lòng đăng nhập để thanh toán!");
    }

    const { amount, orderInfo, cartItems } = data;

    if (!amount || amount < 1000) {
        throw new functions.https.HttpsError("invalid-argument", "Số tiền không hợp lệ (tối thiểu 1.000đ)");
    }

    const requestId = "REQ_" + Date.now();
    const orderId = "FS_" + Date.now();
    const extraData = ""; // Có thể để trống hoặc mã hóa base64 nếu cần
    const requestType = "payWithMethod";

    // 2. Tạo chữ ký (SẮP XẾP THEO BẢNG CHỮ CÁI - BẮT BUỘC)
    // Cấu trúc: accessKey, amount, extraData, ipnUrl, orderId, orderInfo, partnerCode, redirectUrl, requestId, requestType
    const rawSignature = `accessKey=${ACCESS_KEY}&amount=${amount}&extraData=${extraData}&ipnUrl=${IPN_URL}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${PARTNER_CODE}&redirectUrl=${REDIRECT_URL}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
        .createHmac("sha256", SECRET_KEY)
        .update(rawSignature)
        .digest("hex");

    // 3. Chuẩn bị Body gửi sang MoMo
    const requestBody = {
        partnerCode: PARTNER_CODE,
        partnerName: "FoneStore",
        storeId: "FoneStore_Main",
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: REDIRECT_URL,
        ipnUrl: IPN_URL,
        lang: "vi",
        extraData: extraData,
        requestType: requestType,
        signature: signature
    };

    try {
        const response = await axios.post(
            "https://test-payment.momo.vn/v2/gateway/api/create",
            requestBody,
            { timeout: 10000 }
        );

        if (response.data && response.data.payUrl) {
            // 4. Lưu đơn hàng vào Firestore ở trạng thái "Đang chờ thanh toán"
            await admin.firestore().collection("orders").doc(orderId).set({
                orderId: orderId,
                userId: context.auth.uid,
                amount: Number(amount),
                status: "pending_payment",
                items: cartItems || [], // Lưu lại danh sách sản phẩm để xem trong admin
                momoRequestId: requestId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return {
                success: true,
                payUrl: response.data.payUrl,
                orderId: orderId
            };
        } else {
            console.error("MoMo Response Error:", response.data);
            return { success: false, message: response.data.message || "Lỗi tạo mã thanh toán" };
        }
    } catch (error) {
        console.error("Axios/MoMo Error:", error.response ? error.response.data : error.message);
        throw new functions.https.HttpsError("internal", "Lỗi kết nối hệ thống MoMo");
    }
});