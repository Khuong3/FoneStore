const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
const cors = require("cors")({ origin: true }); // Cho phép mọi nguồn truy cập (Giải quyết lỗi CORS)

admin.initializeApp();

// ==================== THÔNG TIN MOMO SANDBOX ====================
const PARTNER_CODE = "MOMOQFSH20250717_TEST"; 
const ACCESS_KEY   = "m1rfCAFskm5T7ec6";
const SECRET_KEY   = "JSyZ4UGLYE5lEX1oZIOTJwVvTtVPz4G2";

const REDIRECT_URL = "https://fonestore.pages.dev/pages/checkout-success.html"; 
const IPN_URL      = "https://fonestore.pages.dev/momo-notification"; 
// ================================================================

exports.createMoMoPayment = functions.https.onRequest((req, res) => {
    // Chạy trong trình bao bọc CORS
    return cors(req, res, async () => {
        // Chỉ chấp nhận phương thức POST
        if (req.method !== 'POST') {
            return res.status(405).send({ data: { error: 'Method Not Allowed' } });
        }

        try {
            // Lấy dữ liệu từ body (Firebase httpsCallable gửi dữ liệu trong field 'data')
            const requestData = req.body.data || {};
            const { amount, orderInfo, cartItems, userId } = requestData;

            if (!amount || amount < 1000) {
                return res.status(200).send({ 
                    data: { success: false, message: "Số tiền không hợp lệ (tối thiểu 1.000đ)" } 
                });
            }

            const requestId = "REQ_" + Date.now();
            const orderId = "FS_" + Date.now();
            const extraData = ""; 
            const requestType = "payWithMethod";

            // 1. Tạo chữ ký signature (Sắp xếp theo Alphabet)
            const rawSignature = `accessKey=${ACCESS_KEY}&amount=${amount}&extraData=${extraData}&ipnUrl=${IPN_URL}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${PARTNER_CODE}&redirectUrl=${REDIRECT_URL}&requestId=${requestId}&requestType=${requestType}`;

            const signature = crypto
                .createHmac("sha256", SECRET_KEY)
                .update(rawSignature)
                .digest("hex");

            // 2. Chuẩn bị Body gửi sang MoMo
            const requestBody = {
                partnerCode: PARTNER_CODE,
                partnerName: "FoneStore",
                storeId: "FoneStore_Main",
                requestId,
                amount,
                orderId,
                orderInfo: orderInfo || "Thanh toán đơn hàng FoneStore",
                redirectUrl: REDIRECT_URL,
                ipnUrl: IPN_URL,
                lang: "vi",
                extraData,
                requestType,
                signature
            };

            // 3. Gọi API MoMo
            const response = await axios.post(
                "https://test-payment.momo.vn/v2/gateway/api/create",
                requestBody,
                { timeout: 10000 }
            );

            if (response.data && response.data.payUrl) {
                // 4. Lưu đơn hàng vào Firestore
                await admin.firestore().collection("orders").doc(orderId).set({
                    orderId: orderId,
                    userId: userId || "guest",
                    amount: Number(amount),
                    status: "pending_payment",
                    items: cartItems || [],
                    momoRequestId: requestId,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // Trả về theo định dạng Firebase Callable yêu cầu { data: ... }
                return res.status(200).send({
                    data: {
                        success: true,
                        payUrl: response.data.payUrl,
                        orderId: orderId
                    }
                });
            } else {
                return res.status(200).send({
                    data: { success: false, message: response.data.message || "Lỗi từ MoMo" }
                });
            }

        } catch (error) {
            console.error("MoMo Error:", error.response ? error.response.data : error.message);
            return res.status(200).send({
                data: { success: false, message: "Lỗi kết nối hệ thống thanh toán" }
            });
        }
    });
});