const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost({ request }) {
    try {
        // Lấy dữ liệu gửi từ Frontend lên
        const data = await request.json();
        const { amount, orderInfo, userId } = data;

        // Cấu hình ZaloPay Sandbox
        const APP_ID = 2553;
        const KEY1   = "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL";
        const REDIRECT_URL = "https://fonestore.pages.dev/pages/checkout-success.html";

        // Đồng bộ thời gian thực tế từ Internet bằng cơ chế dự phòng kép (tránh giờ máy tính local bị chỉnh sai năm 2026)
        let appTime = Date.now();
        try {
            const timeRes = await fetch("https://worldtimeapi.org/api/timezone/Asia/Ho_Chi_Minh").then(r => r.json());
            if (timeRes && timeRes.unixtime) {
                appTime = timeRes.unixtime * 1000;
                console.log("Đồng bộ thời gian qua WorldTimeAPI thành công:", appTime);
            }
        } catch (err) {
            console.error("Lỗi đồng bộ WorldTimeAPI, thử Cloudflare Trace:", err);
            try {
                const traceRes = await fetch("https://1.1.1.1/cdn-cgi/trace").then(r => r.text());
                const tsMatch = traceRes.match(/ts=(\d+)/);
                if (tsMatch) {
                    appTime = Number(tsMatch[1]) * 1000;
                    console.log("Đồng bộ thời gian qua Cloudflare Trace thành công:", appTime);
                }
            } catch (e) {
                console.error("Tất cả các phương thức đồng bộ thời gian đều thất bại, dùng giờ hệ thống:", e);
            }
        }

        // Định dạng app_trans_id: yyMMdd_uniqueId (Dựa trên thời gian thực tế)
        const today = new Date(appTime);
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const parts = formatter.formatToParts(today);
        const year = parts.find(p => p.type === 'year').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        const dateStr = `${year.slice(-2)}${month}${day}`;
        
        const uniqueSuffix = String(appTime).slice(-6) + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        const appTransId = `${dateStr}_${uniqueSuffix}`;

        // Chuẩn hóa appUser thành chuỗi viết thường đơn giản để tránh lỗi định dạng UID của ZaloPay Sandbox
        const appUser = "fstore_user";
        const amountNum = Math.round(Number(amount)); // Đảm bảo số tiền là số nguyên
        
        // ZaloPay Sandbox v2 yêu cầu embed_data và item trong body phải là String (JSON stringify)
        const embedDataObject = {
            redirecturl: REDIRECT_URL
        };
        const itemArray = [];

        const embedDataStr = JSON.stringify(embedDataObject);
        const itemStr = JSON.stringify(itemArray);
        const description = orderInfo || `Thanh toán đơn hàng FStore Coffee #${appTransId}`;

        // 1. Tạo chuỗi dữ liệu để tính mã MAC (Dùng chuỗi stringify)
        const rawData = `${APP_ID}|${appTransId}|${appUser}|${amountNum}|${appTime}|${embedDataStr}|${itemStr}`;

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
            item: itemStr,              // Gửi String
            embed_data: embedDataStr,  // Gửi String
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

        let res;
        if (zalopayResult.return_code === 1 && zalopayResult.order_url) {
            // Trả link thanh toán về cho Frontend
            res = Response.json({ 
                success: true, 
                payUrl: zalopayResult.order_url, 
                orderId: appTransId 
            });
        } else {
            res = Response.json({ 
                success: false, 
                message: zalopayResult.return_message || "Giao dịch thất bại",
                debug: {
                    zalopayResult: zalopayResult,
                    rawData: rawData,
                    requestBody: requestBody
                }
            });
        }

        // Gán CORS headers cho Response
        Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
        return res;

    } catch (error) {
        const res = Response.json({ success: false, message: error.message }, { status: 500 });
        Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
        return res;
    }
}
