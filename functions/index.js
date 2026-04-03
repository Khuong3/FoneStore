const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");

admin.initializeApp();

// ==================== THÔNG TIN MOMO SANDBOX ====================
const PARTNER_CODE = "MOMOQFSH20250717_TEST";
const ACCESS_KEY = "m1rfCAFskm5T7ec6";
const SECRET_KEY = "JSyZ4UGLYE5lEX1oZIOTJwVvTtVPz4G2";

const REDIRECT_URL = "https://fonestore.pages.dev/pages/checkout-success.html";
const IPN_URL = "https://fonestore.pages.dev/momo-notification";
// ================================================================

// Firebase Callable Function
exports.createMoMoPayment = functions.https.onCall(async (data, context) => {
    try {
        const { amount, orderInfo, cartItems, userId } = data || {};

        // 1. Validate amount
        const amountNum = Number(amount);
        if (isNaN(amountNum) || amountNum < 1000) {
            return {
                success: false,
                message: "Số tiền không hợp lệ (tối thiểu 1.000đ)"
            };
        }

        const requestId = "REQ_" + Date.now();
        const orderId = "FS_" + Date.now();
        const extraData = "";
        const requestType = "payWithMethod";

        // 2. Tạo raw signature đúng format MoMo yêu cầu
        const rawSignature = `accessKey=${ACCESS_KEY}&amount=${amountNum}&extraData=${extraData}&ipnUrl=${IPN_URL}&orderId=${orderId}&orderInfo=${orderInfo || "Payment"}&partnerCode=${PARTNER_CODE}&redirectUrl=${REDIRECT_URL}&requestId=${requestId}&requestType=${requestType}`;

        const signature = crypto
            .createHmac("sha256", SECRET_KEY)
            .update(rawSignature)
            .digest("hex");

        // 3. Request body gửi sang MoMo
        const requestBody = {
            partnerCode: PARTNER_CODE,
            partnerName: "FoneStore",
            storeId: "FoneStore_Main",
            requestId: requestId,
            amount: amountNum,
            orderId: orderId,
            orderInfo: orderInfo || "Thanh toán đơn hàng FoneStore",
            redirectUrl: REDIRECT_URL,
            ipnUrl: IPN_URL,
            lang: "vi",
            extraData: extraData,
            requestType: requestType,
            signature: signature
        };

        console.log("MoMo Request Body:", requestBody);

        // 4. Gọi API MoMo
        const response = await axios.post(
            "https://test-payment.momo.vn/v2/gateway/api/create",
            requestBody,
            {
                headers: {
                    "Content-Type": "application/json"
                },
                timeout: 15000
            }
        );

        console.log("MoMo Response:", response.data);

        // 5. Nếu thành công thì lưu đơn hàng
        if (response.data && response.data.payUrl) {
            await admin.firestore().collection("orders").doc(orderId).set({
                orderId: orderId,
                userId: userId || "guest",
                amount: amountNum,
                status: "pending_payment",
                items: cartItems || [],
                momoRequestId: requestId,
                payUrl: response.data.payUrl,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return {
                success: true,
                payUrl: response.data.payUrl,
                orderId: orderId
            };
        } else {
            console.error("MoMo API Error Response:", response.data);
            return {
                success: false,
                message: response.data.message || "Lỗi từ MoMo"
            };
        }

    } catch (error) {
        console.error("Internal Error:", error.response ? error.response.data : error.message);

        return {
            success: false,
            message: error.response?.data?.message || "Không thể kết nối với hệ thống MoMo"
        };
    }
});