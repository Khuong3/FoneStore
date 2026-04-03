const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
const cors = require("cors")({ origin: true }); 

admin.initializeApp();

// ==================== THÔNG TIN MOMO SANDBOX ====================
const PARTNER_CODE = "MOMOQFSH20250717_TEST"; 
const ACCESS_KEY   = "m1rfCAFskm5T7ec6";
const SECRET_KEY   = "JSyZ4UGLYE5lEX1oZIOTJwVvTtVPz4G2";

// Đảm bảo các URL này khớp chính xác với domain bạn đang dùng
const REDIRECT_URL = "https://fonestore.pages.dev/pages/checkout-success.html"; 
const IPN_URL      = "https://fonestore.pages.dev/momo-notification"; 
// ================================================================

exports.createMoMoPayment = functions.https.onRequest((req, res) => {
    // Chạy trong trình bao bọc CORS để cho phép gọi từ domain khác
    return cors(req, res, async () => {
        // Hỗ trợ cả OPTIONS (cho CORS preflight) và POST
        if (req.method === 'OPTIONS') {
            return res.status(204).send();
        }

        if (req.method !== 'POST') {
            return res.status(405).send({ data: { error: 'Method Not Allowed' } });
        }

        try {
            // Firebase httpsCallable bọc dữ liệu trong field 'data'
            const requestData = req.body.data || {};
            const { amount, orderInfo, cartItems, userId } = requestData;

            // Kiểm tra số tiền hợp lệ
            const amountNum = Number(amount);
            if (isNaN(amountNum) || amountNum < 1000) {
                return res.status(200).send({ 
                    data: { success: false, message: "Số tiền không hợp lệ (tối thiểu 1.000đ)" } 
                });
            }

            const requestId = "REQ_" + Date.now();
            const orderId = "FS_" + Date.now();
            const extraData = ""; 
            const requestType = "payWithMethod";

            // 1. Tạo chữ ký signature (Sắp xếp theo Alphabet - Bắt buộc)
            const rawSignature = `accessKey=${ACCESS_KEY}&amount=${amountNum}&extraData=${extraData}&ipnUrl=${IPN_URL}&orderId=${orderId}&orderInfo=${orderInfo || "Payment"}&partnerCode=${PARTNER_CODE}&redirectUrl=${REDIRECT_URL}&requestId=${requestId}&requestType=${requestType}`;

            const signature = crypto
                .createHmac("sha256", SECRET_KEY)
                .update(rawSignature)
                .digest("hex");

            // 2. Chuẩn bị Body gửi sang MoMo
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

            // 3. Gọi API MoMo với timeout
            const response = await axios.post(
                "https://test-payment.momo.vn/v2/gateway/api/create",
                requestBody,
                { timeout: 15000 }
            );

            if (response.data && response.data.payUrl) {
                // 4. Lưu đơn hàng vào Firestore ở trạng thái chờ
                await admin.firestore().collection("orders").doc(orderId).set({
                    orderId: orderId,
                    userId: userId || "guest",
                    amount: amountNum,
                    status: "pending_payment",
                    items: cartItems || [],
                    momoRequestId: requestId,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // Trả về cho Frontend
                return res.status(200).send({
                    data: {
                        success: true,
                        payUrl: response.data.payUrl,
                        orderId: orderId
                    }
                });
            } else {
                console.error("MoMo API Error Response:", response.data);
                return res.status(200).send({
                    data: { success: false, message: response.data.message || "Lỗi từ MoMo" }
                });
            }

        } catch (error) {
            console.error("Internal Error:", error.response ? error.response.data : error.message);
            return res.status(200).send({
                data: { success: false, message: "Không thể kết nối với hệ thống MoMo" }
            });
        }
    });
});