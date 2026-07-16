export async function onRequestPost({ request }) {
    try {
        // Lấy dữ liệu gửi từ Frontend lên
        const data = await request.json();
        const { amount, orderInfo, userId } = data;

        // Cấu hình ZaloPay Sandbox mặc định
        const APP_ID = 2553;
        const KEY1   = "9phuAOYbc5v14336B5be516H155091a2";
        const REDIRECT_URL = "https://fonestore.pages.dev/pages/checkout-success.html";

        // Định dạng app_trans_id: yyMMdd_uniqueId (chuẩn múi giờ Việt Nam GMT+7)
        const today = new Date();
        const tzOffset = 7 * 60 * 60 * 1000; 
        const todayVN = new Date(today.getTime() + tzOffset);
        const yy = String(todayVN.getUTCFullYear()).slice(-2);
        const mm = String(todayVN.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(todayVN.getUTCDate()).padStart(2, '0');
        const dateStr = `${yy}${mm}${dd}`;
        const appTransId = `${dateStr}_${Date.now()}`;

        const appUser = userId || "FStore_Customer";
        const appTime = Date.now();
        const amountNum = Math.round(Number(amount)); // Đảm bảo số tiền là số nguyên
        
        // ZaloPay yêu cầu embed_data và item dạng JSON string
        const embedData = JSON.stringify({
            redirecturl: REDIRECT_URL
        });
        const item = JSON.stringify([]);
        const description = orderInfo || `Thanh toán đơn hàng FStore Coffee #${appTransId}`;

        // 1. Tạo chuỗi dữ liệu để tính mã MAC
        const rawData = `${APP_ID}|${appTransId}|${appUser}|${amountNum}|${appTime}|${embedData}|${item}`;

        // 2. Mã hóa chữ ký HMAC SHA256 (Dùng Web Crypto API)
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw", 
            encoder.encode(KEY1), 
            { name: "HMAC", hash: "SHA-256" }, 
            false, 
            ["sign"]
        );
        const macBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawData));
        const mac = Array.from(new Uint8Array(macBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        // 3. Chuẩn bị Request Body gửi sang ZaloPay Sandbox
        const requestBody = {
            app_id: APP_ID,
            app_user: appUser,
            app_trans_id: appTransId,
            app_time: appTime,
            amount: amountNum,
            item: item,
            embed_data: embedData,
            description: description,
            bank_code: "",
            mac: mac
        };

        // 4. Gọi API tạo đơn hàng của ZaloPay Sandbox
        const response = await fetch("https://sb-openapi.zalopay.vn/v2/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        const zalopayResult = await response.json();

        // Ghi log kết quả để debug
        console.log("ZaloPay Sandbox API response:", JSON.stringify(zalopayResult));

        if (zalopayResult.return_code === 1 && zalopayResult.order_url) {
            // Trả link thanh toán về cho Frontend
            return Response.json({ 
                success: true, 
                payUrl: zalopayResult.order_url, 
                orderId: appTransId 
            });
        } else {
            return Response.json({ 
                success: false, 
                message: zalopayResult.return_message || "Giao dịch thất bại",
                debug: zalopayResult
            });
        }

    } catch (error) {
        return Response.json({ success: false, message: error.message }, { status: 500 });
    }
}
