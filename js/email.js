// js/email.js
// Quản lý cấu hình và các API gửi Email thông qua EmailJS
import { db } from './config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ĐỐI VỚI NGƯỜI DÙNG: Hãy điền các thông tin EmailJS của bạn ở đây
export const emailjsConfig = {
    serviceId: "service_fstore",          // Service ID của bạn từ EmailJS
    publicKey: "tlBWYrwaB2_uOtB5b",    // Public Key của bạn từ EmailJS
    privateKey: "I5eiLCuM4AccA2jVgIxZ9",  // Private Key (chỉ dùng nếu chạy ở Server-side / Cloud Functions)
    
    // Các Template ID tương ứng
    templates: {
        adminProductNotification: "template_admin_prod", // Gửi mail cho Admin khi nhân viên thêm/sửa/đóng sản phẩm
        customerOrderConfirmation: "template_cust_order", // Gửi xác nhận đơn hàng cho khách hàng
        staffOrderNotification: "template_staff_order",   // Gửi báo đơn mới cho nhân viên
        dailySummaryNotification: "template_daily_summary" // Gửi báo cáo đơn hàng chưa hoàn thành cuối ngày
    },
    
    // Email người nhận mặc định (nếu không truy vấn được từ Firestore)
    adminFallbackEmail: "admin_fonestore@mailinator.com",
    staffFallbackEmail: "staff_fonestore@mailinator.com"
};

// Tự động tải thư viện EmailJS Browser SDK từ CDN nếu chưa được tích hợp
export function initEmailJS() {
    return new Promise((resolve) => {
        if (window.emailjs) {
            window.emailjs.init({ publicKey: emailjsConfig.publicKey });
            resolve(window.emailjs);
            return;
        }
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
        script.onload = () => {
            window.emailjs.init({ publicKey: emailjsConfig.publicKey });
            resolve(window.emailjs);
        };
        document.head.appendChild(script);
    });
}

// 1. Gửi thông báo phê duyệt sản phẩm cho Admin
export async function sendAdminProductNotification({ staffName, actionType, productName, details, editReason }) {
    await initEmailJS();
    
    // Tìm email của Admin trong DB
    let adminEmail = emailjsConfig.adminFallbackEmail;
    try {
        const q = query(collection(db, "users"), where("role", "==", "admin"));
        const snap = await getDocs(q);
        if (!snap.empty) {
            adminEmail = snap.docs[0].data().email || adminEmail;
        }
    } catch (e) {
        console.error("Lỗi tìm email Admin:", e);
    }

    const templateParams = {
        to_email: adminEmail,
        staff_name: staffName,
        action_type: actionType,
        product_name: productName,
        details: details,
        edit_reason: editReason || "Không có",
        subject: `[FoneStore Admin] Yêu cầu phê duyệt: ${actionType} - ${productName}`
    };

    try {
        const response = await window.emailjs.send(
            emailjsConfig.serviceId,
            emailjsConfig.templates.adminProductNotification,
            templateParams
        );
        console.log("Email gửi cho Admin thành công:", response);
        return { success: true, response };
    } catch (error) {
        console.error("Lỗi gửi EmailJS cho Admin:", error);
        return { success: false, error };
    }
}

// 2. Gửi xác nhận đơn hàng cho Khách hàng
export async function sendOrderConfirmationToCustomer(orderId, orderData) {
    await initEmailJS();

    const itemsText = orderData.items.map(item => 
        `- ${item.name} x ${item.quantity} (Giá: ${Number(item.price).toLocaleString()}đ)`
    ).join("\n");

    const estDelivery = new Date();
    estDelivery.setDate(estDelivery.getDate() + 3); // Dự kiến giao hàng sau 3 ngày
    const estDeliveryStr = estDelivery.toLocaleDateString("vi-VN");

    const templateParams = {
        to_email: orderData.userEmail || orderData.email || "",
        customer_name: orderData.fullName || "Khách hàng",
        order_id: orderId,
        items_list: itemsText,
        total_amount: `${Number(orderData.amount).toLocaleString()}đ`,
        payment_method: orderData.method || "ZaloPay",
        shipping_address: `${orderData.address}, ${orderData.ward}, ${orderData.district}, ${orderData.province}`,
        est_delivery: estDeliveryStr,
        subject: `[FoneStore] Xác nhận đơn hàng thành công #${orderId}`
    };

    try {
        const response = await window.emailjs.send(
            emailjsConfig.serviceId,
            emailjsConfig.templates.customerOrderConfirmation,
            templateParams
        );
        console.log("Email xác nhận gửi cho khách thành công:", response);
        return { success: true, response };
    } catch (error) {
        console.error("Lỗi gửi EmailJS cho khách:", error);
        return { success: false, error };
    }
}

// 3. Gửi thông báo đơn hàng mới cho Nhân viên
export async function sendOrderNotificationToStaff(orderId, orderData) {
    await initEmailJS();

    // Lấy danh sách email của nhân viên (staff) trong DB
    let staffEmails = [emailjsConfig.staffFallbackEmail];
    try {
        const q = query(collection(db, "users"), where("role", "==", "staff"));
        const snap = await getDocs(q);
        const fetched = [];
        snap.forEach(d => {
            const u = d.data();
            if (u.email) fetched.push(u.email);
        });
        if (fetched.length > 0) staffEmails = fetched;
    } catch (e) {
        console.error("Lỗi tìm email Nhân viên:", e);
    }

    const itemsText = orderData.items.map(item => 
        `- ${item.name} x ${item.quantity}`
    ).join("\n");

    const promises = staffEmails.map(async (email) => {
        const templateParams = {
            to_email: email,
            order_id: orderId,
            customer_name: orderData.fullName || "Khách hàng",
            items_list: itemsText,
            total_amount: `${Number(orderData.amount).toLocaleString()}đ`,
            payment_method: orderData.method || "ZaloPay",
            subject: `[FoneStore Staff] Đơn hàng mới cần xử lý #${orderId}`
        };

        try {
            return await window.emailjs.send(
                emailjsConfig.serviceId,
                emailjsConfig.templates.staffOrderNotification,
                templateParams
            );
        } catch (err) {
            console.error(`Lỗi gửi EmailJS đến nhân viên (${email}):`, err);
            return null;
        }
    });

    return await Promise.all(promises);
}

// 4. Gửi báo cáo đơn hàng chưa hoàn thành cuối ngày (5:00 PM)
export async function sendDailyIncompleteOrdersSummary(emailList, summaryContent) {
    await initEmailJS();

    const promises = emailList.map(async (email) => {
        const templateParams = {
            to_email: email,
            summary_content: summaryContent,
            report_date: new Date().toLocaleDateString("vi-VN"),
            subject: `[FoneStore Daily Summary] Báo cáo các đơn hàng chưa hoàn thành cần xử lý`
        };

        try {
            return await window.emailjs.send(
                emailjsConfig.serviceId,
                emailjsConfig.templates.dailySummaryNotification,
                templateParams
            );
        } catch (err) {
            console.error(`Lỗi gửi EmailJS báo cáo cuối ngày đến (${email}):`, err);
            return null;
        }
    });

    return await Promise.all(promises);
}
