export async function onRequestPost({ request }) {
    try {
        // Lấy dữ liệu từ Frontend gửi lên
        const data = await request.json();
        const { amount, orderInfo, userId } = data;

        // Cấu hình MoMo Sandbox
        const PARTNER_CODE = "MOMOQFSH20250717_TEST";
        const ACCESS_KEY   = "m1rfCAFskm5T7ec6";
        const SECRET_KEY   = "JSyZ4UGLYE5lEX1oZIOTJwVvTtVPz4G2";
        const REDIRECT_URL = "https://fonestore.pages.dev/pages/checkout-success.html";
        const IPN_URL      = "https://fonestore.pages.dev/momo-notification";

        // Chuẩn bị các biến
        const amountNum = Number(amount);
        const requestId = "REQ_" + Date.now();
        const orderId = "FS_" + Date.now();
        const requestType = "payWithMethod";
        const extraData = "";

        // 1. Tạo chuỗi ký tự theo quy tắc của MoMo
        const rawSignature = `accessKey=${ACCESS_KEY}&amount=${amountNum}&extraData=${extraData}&ipnUrl=${IPN_URL}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${PARTNER_CODE}&redirectUrl=${REDIRECT_URL}&requestId=${requestId}&requestType=${requestType}`;

        // 2. Mã hóa chữ ký HMAC SHA256 (Dùng Web Crypto API chuẩn của Cloudflare)
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw", 
            encoder.encode(SECRET_KEY), 
            { name: "HMAC", hash: "SHA-256" }, 
            false, 
            ["sign"]
        );
        const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawSignature));
        const signature = Array.from(new Uint8Array(signatureBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        // 3. Chuẩn bị Body gửi sang MoMo
        const requestBody = {
            partnerCode: PARTNER_CODE,
            partnerName: "FoneStore",
            storeId: "FoneStore_Main",
            requestId: requestId,
            amount: amountNum,
            orderId: orderId,
            orderInfo: orderInfo,
            redirectUrl: REDIRECT_URL,
            ipnUrl: IPN_URL,
            lang: "vi",
            extraData: extraData,
            requestType: requestType,
            signature: signature
        };

        // 4. Gọi API MoMo từ Server Cloudflare
        const response = await fetch("https://test-payment.momo.vn/v2/gateway/api/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        const momoResult = await response.json();

        if (momoResult.payUrl) {
            // Trả link thanh toán về cho Frontend (file cart.html)
            return Response.json({ success: true, payUrl: momoResult.payUrl, orderId: orderId });
        } else {
            return Response.json({ success: false, message: momoResult.message || "Lỗi từ MoMo" });
        }

    } catch (error) {
        return Response.json({ success: false, message: error.message }, { status: 500 });
    }
}