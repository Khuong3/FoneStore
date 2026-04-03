const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

admin.initializeApp();

// ==================== THAY THÔNG TIN MO MO SANDBOX CỦA BẠN VÀO ĐÂY ====================
const PARTNER_CODE = "MOMOQFSH20250717_TEST";     // Ví dụ: MOMO1234567890
const ACCESS_KEY   = "m1rfCAFskm5T7ec6";
const SECRET_KEY   = "JSyZ4UGLYE5lEX1oZIOTJwVvTtVPz4G2";

const REDIRECT_URL = "https://fonestore.web.app/checkout-success.html";  // ← Thay "fonestore" thành Project ID thật của bạn
const IPN_URL      = "https://fonestore.web.app/momo-notification";     // Có thể để tạm
// ===================================================================================

exports.createMoMoPayment = functions.https.onCall(async (data, context) => {
    // Kiểm tra đã đăng nhập chưa
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Bạn phải đăng nhập để thanh toán");
    }

    const { amount, orderInfo = "Thanh toán đơn hàng tại FoneStore" } = data;

    if (!amount || amount < 1000) {
        throw new functions.https.HttpsError("invalid-argument", "Số tiền tối thiểu là 1.000 VNĐ");
    }

    const requestId = uuidv4();
    const orderId = `ORD${Date.now()}`;

    // Tạo chữ ký (signature) theo yêu cầu của MoMo
    const rawSignature = `accessKey=${ACCESS_KEY}&amount=${amount}&extraData=&ipnUrl=${IPN_URL}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${PARTNER_CODE}&redirectUrl=${REDIRECT_URL}&requestId=${requestId}&requestType=payWithMethod`;

    const signature = crypto
        .createHmac("sha256", SECRET_KEY)
        .update(rawSignature)
        .digest("hex");

    const requestBody = {
        partnerCode: PARTNER_CODE,
        partnerName: "FoneStore",
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: REDIRECT_URL,
        ipnUrl: IPN_URL,
        lang: "vi",
        extraData: "",
        requestType: "payWithMethod",
        signature: signature
    };

    try {
        const response = await axios.post(
            "https://test-payment.momo.vn/v2/gateway/api/create",
            requestBody,
            { timeout: 10000 }
        );

        if (response.data && response.data.payUrl) {
            // Lưu thông tin đơn hàng vào Firestore
            await admin.firestore().collection("orders").doc(orderId).set({
                orderId: orderId,
                userId: context.auth.uid,
                amount: Number(amount),
                status: "pending",
                paymentMethod: "MoMo",
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
            throw new Error("MoMo không trả về link thanh toán");
        }
    } catch (error) {
        console.error("MoMo Payment Error:", error.response ? error.response.data : error.message);
        throw new functions.https.HttpsError("internal", "Không thể kết nối với MoMo. Vui lòng thử lại sau.");
    }
});