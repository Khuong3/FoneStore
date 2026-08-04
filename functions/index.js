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

// ==================== BÁO CÁO CUỐI NGÀY (5:00 PM) ====================
// Chạy lúc 17h00 hàng ngày (giờ Việt Nam, tương đương 10h00 UTC)
exports.dailyOrderSummaryReport = functions.pubsub
    .schedule('0 17 * * *')
    .timeZone('Asia/Ho_Chi_Minh')
    .onRun(async (context) => {
        try {
            console.log("Bắt đầu chạy báo cáo đơn hàng chưa hoàn thành cuối ngày...");
            
            // 1. Lấy tất cả các đơn hàng có trạng thái KHÁC "Hoàn thành" và "Hủy"
            const ordersSnap = await admin.firestore().collection("orders").get();
            const incompleteOrders = [];
            
            ordersSnap.forEach(doc => {
                const o = doc.data();
                if (o.status !== "Hoàn thành" && o.status !== "Hủy") {
                    incompleteOrders.push({ id: doc.id, ...o });
                }
            });
            
            if (incompleteOrders.length === 0) {
                console.log("Không có đơn hàng chưa hoàn thành nào.");
                return null;
            }
            
            // 2. Tạo nội dung tóm tắt
            let summaryContent = `Báo cáo ngày ${new Date().toLocaleDateString("vi-VN")}:\n`;
            summaryContent += `Có tổng cộng ${incompleteOrders.length} đơn hàng chưa hoàn thành và cần xử lý:\n\n`;
            incompleteOrders.forEach((o, index) => {
                const itemsStr = o.items ? o.items.map(i => `${i.name} x${i.quantity}`).join(", ") : "Không có";
                summaryContent += `${index + 1}. Đơn hàng #${o.id || o.orderId}\n`;
                summaryContent += `   - Khách hàng: ${o.fullName || "N/A"} (${o.phone || "N/A"})\n`;
                summaryContent += `   - Trạng thái: ${o.status || "N/A"}\n`;
                summaryContent += `   - Trị giá: ${Number(o.amount || o.totalPrice || 0).toLocaleString()}đ\n`;
                summaryContent += `   - Chi tiết sản phẩm: ${itemsStr}\n`;
                summaryContent += `   - Địa chỉ: ${o.address || ""}, ${o.ward || ""}, ${o.district || ""}, ${o.province || ""}\n\n`;
            });
            
            // 3. Lấy toàn bộ email của Admin và Staff
            const usersSnap = await admin.firestore().collection("users").get();
            const emailList = [];
            usersSnap.forEach(doc => {
                const u = doc.data();
                if ((u.role === "admin" || u.role === "staff") && u.email) {
                    emailList.push(u.email);
                }
            });
            
            // Fallback nếu không tìm thấy email nào
            if (emailList.length === 0) {
                emailList.push("admin_fonestore@mailinator.com");
            }
            
            // 4. Gửi email thông qua EmailJS REST API
            const SERVICE_ID = "service_fstore"; 
            const TEMPLATE_ID = "template_099l9zq";
            const PUBLIC_KEY = "tlBWYrwaB2_uOtB5b";
            const PRIVATE_KEY = "I5eiLCuM4AccA2jVgIxZ9"; // Cần cung cấp Private Key cho server-side

            const reportDate = new Date().toLocaleDateString("vi-VN");
            const htmlContent = `
                <p style="margin-top: 0; font-size: 16px;">Xin chào thành viên FoneStore,</p>
                <p style="line-height: 1.6;">Dưới đây là danh sách tổng hợp các đơn hàng hiện có trạng thái **chưa hoàn thành** cần xử lý cuối ngày hôm nay:</p>
                
                <div style="margin: 20px 0; background-color: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; white-space: pre-line; line-height: 1.8; font-size: 14px; color: #333333; font-family: monospace, Courier;">
                    ${summaryContent}
                </div>

                <p style="margin-top: 24px; line-height: 1.6; font-size: 14px; color: #e63946; font-weight: 600;">⚠️ Yêu cầu:</p>
                <p style="line-height: 1.6; font-size: 14px; color: #555555; margin-top: 4px;">Tất cả nhân viên và Admin phụ trách đơn hàng vui lòng đối soát trạng thái, liên hệ đơn vị vận chuyển hoặc khách hàng để hoàn tất các đơn hàng tồn đọng trên.</p>
            `;

            const promises = emailList.map(async (email) => {
                const requestBody = {
                    service_id: SERVICE_ID,
                    template_id: TEMPLATE_ID,
                    user_id: PUBLIC_KEY,
                    accessToken: PRIVATE_KEY,
                    template_params: {
                        to_email: email,
                        email: email, // Hỗ trợ cả {{email}}
                        notification_title: `BÁO CÁO ĐƠN HÀNG CHƯA HOÀN THÀNH - ${reportDate}`,
                        message_content: htmlContent,
                        subject: `[FoneStore Daily Summary] Báo cáo các đơn hàng chưa hoàn thành cần xử lý`
                    }
                };
                
                try {
                    await axios.post("https://api.emailjs.com/api/v1.0/email/send", requestBody, {
                        headers: { "Content-Type": "application/json" }
                    });
                    console.log(`Báo cáo cuối ngày đã gửi thành công tới: ${email}`);
                } catch (err) {
                    console.error(`Lỗi gửi báo cáo tới ${email}:`, err.response ? err.response.data : err.message);
                }
            });
            
            await Promise.all(promises);
            console.log("Hoàn thành quy trình gửi báo cáo cuối ngày.");
            return null;
        } catch (error) {
            console.error("Lỗi trong dailyOrderSummaryReport:", error);
            return null;
        }
    });