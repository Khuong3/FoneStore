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

// ==================== THÔNG TIN ZALOPAY SANDBOX ====================
const ZP_APP_ID = 2553;
const ZP_KEY1   = "9phuAOYbc5v14336B5be516H155091a2";
const ZP_REDIRECT_URL = "https://fonestore.pages.dev/pages/checkout-success.html";
// ===================================================================

exports.createZaloPayPayment = functions.https.onCall(async (data, context) => {
    try {
        const { amount, orderInfo, cartItems, userId } = data || {};

        const amountNum = Number(amount);
        if (isNaN(amountNum) || amountNum < 1000) {
            return {
                success: false,
                message: "Số tiền không hợp lệ (tối thiểu 1.000đ)"
            };
        }

        // Định dạng app_trans_id: yyMMdd_uniqueId
        const today = new Date();
        const yy = String(today.getFullYear()).slice(-2);
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const dateStr = `${yy}${mm}${dd}`;
        const appTransId = `${dateStr}_${Date.now()}`;

        const appUser = userId || "guest";
        const appTime = Date.now();
        const embedData = JSON.stringify({ redirecturl: ZP_REDIRECT_URL });
        const itemStr = JSON.stringify([]);
        const description = orderInfo || `Thanh toán đơn hàng FStore Coffee #${appTransId}`;

        // 1. Tạo chuỗi ký tự tính MAC
        const rawData = `${ZP_APP_ID}|${appTransId}|${appUser}|${amountNum}|${appTime}|${embedData}|${itemStr}`;

        // 2. Tính MAC bằng HMAC SHA256
        const mac = crypto
            .createHmac("sha256", ZP_KEY1)
            .update(rawData)
            .digest("hex");

        // 3. Request body gửi sang ZaloPay Sandbox
        const requestBody = {
            app_id: ZP_APP_ID,
            app_user: appUser,
            app_trans_id: appTransId,
            app_time: appTime,
            amount: amountNum,
            item: itemStr,
            embed_data: embedData,
            description: description,
            bank_code: "",
            mac: mac
        };

        console.log("ZaloPay Request Body:", requestBody);

        // 4. Gọi API tạo đơn hàng của ZaloPay Sandbox
        const response = await axios.post(
            "https://sb-openapi.zalopay.vn/v2/create",
            requestBody,
            {
                headers: { "Content-Type": "application/json" },
                timeout: 15000
            }
        );

        console.log("ZaloPay Response:", response.data);

        // 5. Nếu thành công thì lưu đơn hàng vào Firestore
        if (response.data && response.data.return_code === 1 && response.data.order_url) {
            await admin.firestore().collection("orders").doc(appTransId).set({
                orderId: appTransId,
                userId: userId || "guest",
                amount: amountNum,
                status: "pending_payment",
                items: cartItems || [],
                payUrl: response.data.order_url,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return {
                success: true,
                payUrl: response.data.order_url,
                orderId: appTransId
            };
        } else {
            console.error("ZaloPay API Error Response:", response.data);
            return {
                success: false,
                message: response.data.return_message || "Lỗi từ ZaloPay"
            };
        }

    } catch (error) {
        console.error("ZaloPay Internal Error:", error.response ? error.response.data : error.message);
        return {
            success: false,
            message: error.response?.data?.return_message || error.message || "Không thể kết nối với hệ thống ZaloPay"
        };
    }
});