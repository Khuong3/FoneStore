// js/email.js
// Quản lý cấu hình và các API gửi Email thông qua EmailJS
import { db } from './config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// CẤU HÌNH EMAILJS: Hỗ trợ gói Free tối đa 2 Email Templates
export const emailjsConfig = {
    serviceId: "service_53hagsn",          // Service ID của bạn từ EmailJS
    publicKey: "tIBWYrwaB2_uOtB5b",    // Public Key của bạn từ EmailJS
    privateKey: "l5eiLCuM4AccA2jVgIxZ9",  // Private Key (chỉ dùng nếu chạy ở Server-side / Cloud Functions)
    
    // 2 mẫu Email tương ứng
    templates: {
        customerOrderConfirmation: "template_vbkai2r", // Mẫu 1: Gửi xác nhận đơn hàng cho khách hàng
        staffOrderNotification: "template_099l9zq"   // Mẫu 2: Gửi cho nội bộ Admin/Staff (dùng chung cho mọi thông báo đơn mới, duyệt sản phẩm, báo cáo ngày)
    },
    
    // Email người nhận mặc định (nếu không truy vấn được từ Firestore)
    adminFallbackEmail: "admin_fonestore@mailinator.com",
    staffFallbackEmail: "staff_fonestore@mailinator.com"
};

// Tự động tải thư viện EmailJS Browser SDK từ CDN nếu chưa được tích hợp
function initEmailJS() {
    return new Promise((resolve) => {
        if (window.emailjs) {
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

// 1. Gửi thông báo phê duyệt sản phẩm cho Admin (Dùng chung mẫu template_staff_order)
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

    const htmlContent = `
        <p style="margin-top: 0; font-size: 16px;">Xin chào Admin,</p>
        <p style="line-height: 1.6;">Một nhân viên bán hàng vừa gửi yêu cầu phê duyệt thao tác sản phẩm trên hệ thống. Chi tiết yêu cầu:</p>
        
        <div style="background-color: #f9f9f9; border-left: 4px solid #d4af37; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                    <td style="padding: 6px 0; color: #666666; width: 140px; font-weight: 600;">Nhân viên yêu cầu:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #111;">${staffName}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #666666; font-weight: 600;">Loại yêu cầu:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #e76f51;">${actionType}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #666666; font-weight: 600;">Sản phẩm:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #d4af37;">${productName}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #666666; font-weight: 600;">Thông tin đề xuất:</td>
                    <td style="padding: 6px 0; font-weight: 600;">${details}</td>
                </tr>
            </table>
        </div>

        <h4 style="margin: 20px 0 10px 0; font-size: 15px; border-bottom: 1px solid #eeeeee; padding-bottom: 6px; color: #e63946;">Lý do thực hiện thay đổi:</h4>
        <div style="font-size: 14px; background-color: #fff0f0; border-left: 4px solid #e63946; padding: 12px 16px; border-radius: 4px; color: #c0392b; font-style: italic;">
            "${editReason || "Không có lý do"}"
        </div>

        <p style="margin-top: 24px; line-height: 1.6; font-size: 14px; color: #555555;">Vui lòng đăng nhập vào trang quản lý Admin, mở mục **Quản lý sản phẩm** và chọn tab **"Duyệt yêu cầu"** để xem chi tiết thông tin ảnh và tiến hành Duyệt hoặc Từ chối.</p>
    `;

    const templateParams = {
        to_email: adminEmail,
        email: adminEmail, // Đồng bộ với {{email}} trên giao diện EmailJS
        notification_title: "YÊU CẦU PHÊ DUYỆT SẢN PHẨM",
        message_content: htmlContent,
        subject: `[FoneStore Admin] Yêu cầu phê duyệt: ${actionType} - ${productName}`
    };

    try {
        console.log(`Gửi mail yêu cầu phê duyệt sản phẩm tới Admin: ${adminEmail}`);
        const response = await window.emailjs.send(
            emailjsConfig.serviceId,
            emailjsConfig.templates.staffOrderNotification,
            templateParams
        );
        console.log("Email gửi cho Admin thành công:", response);
        return { success: true, response };
    } catch (error) {
        console.error("Lỗi gửi EmailJS cho Admin:", error);
        return { success: false, error };
    }
}

// 2. Gửi xác nhận đơn hàng cho Khách hàng (Dùng mẫu template_cust_order độc lập)
export async function sendOrderConfirmationToCustomer(orderId, orderData) {
    await initEmailJS();

    const itemsText = orderData.items.map(item => 
        `- ${item.name} x ${item.quantity} (Giá: ${Number(item.price).toLocaleString()}đ)`
    ).join("\n");

    const estDelivery = new Date();
    estDelivery.setDate(estDelivery.getDate() + 3); // Dự kiến giao hàng sau 3 ngày
    const estDeliveryStr = estDelivery.toLocaleDateString("vi-VN");

    const targetEmail = orderData.userEmail || orderData.email || "";

    const templateParams = {
        to_email: targetEmail,
        email: targetEmail, // Đồng bộ với {{email}} trên giao diện EmailJS
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
        console.log(`Tiến hành gửi email xác nhận cho Khách hàng tới địa chỉ: ${targetEmail}`);
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

// 3. Gửi thông báo đơn hàng mới cho Nhân viên và cả Admin (Dùng chung mẫu template_staff_order)
export async function sendOrderNotificationToStaff(orderId, orderData) {
    await initEmailJS();

    // Lấy danh sách email của toàn bộ Nhân viên (staff) và cả Admin (admin) từ Firestore
    let recipientEmails = [emailjsConfig.staffFallbackEmail, emailjsConfig.adminFallbackEmail];
    try {
        const qStaff = query(collection(db, "users"), where("role", "==", "staff"));
        const qAdmin = query(collection(db, "users"), where("role", "==", "admin"));
        
        const [snapStaff, snapAdmin] = await Promise.all([getDocs(qStaff), getDocs(qAdmin)]);
        const fetched = [];
        
        snapStaff.forEach(d => {
            const u = d.data();
            if (u.email) fetched.push(u.email);
        });
        snapAdmin.forEach(d => {
            const u = d.data();
            if (u.email) fetched.push(u.email);
        });
        
        if (fetched.length > 0) {
            recipientEmails = [...new Set(fetched)]; // Loại bỏ trùng lặp nếu có
        }
    } catch (e) {
        console.error("Lỗi tìm email Nhân viên/Admin:", e);
    }

    const itemsText = orderData.items.map(item => 
        `- ${item.name} x ${item.quantity}`
    ).join("\n");

    const htmlContent = `
        <p style="margin-top: 0; font-size: 16px;">Xin chào,</p>
        <p style="line-height: 1.6;">Hệ thống vừa ghi nhận một đơn hàng mới cần được xử lý nhanh chóng. Dưới đây là thông tin chi tiết:</p>
        
        <div style="background-color: #f9f9f9; border-left: 4px solid #d4af37; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                    <td style="padding: 6px 0; color: #666666; width: 140px; font-weight: 600;">Mã đơn hàng:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #d4af37;">#${orderId}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #666666; font-weight: 600;">Khách hàng:</td>
                    <td style="padding: 6px 0; font-weight: 600;">${orderData.fullName || "Khách hàng"}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #666666; font-weight: 600;">Tổng giá trị:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #e63946;">${Number(orderData.amount).toLocaleString()}đ</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #666666; font-weight: 600;">Thanh toán:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #2a9d8f;">${orderData.method || "ZaloPay"}</td>
                </tr>
            </table>
        </div>

        <h4 style="margin: 20px 0 10px 0; font-size: 15px; border-bottom: 1px solid #eeeeee; padding-bottom: 6px; color: #111;">Sản phẩm đặt mua:</h4>
        <div style="white-space: pre-line; line-height: 1.6; font-size: 14px; background-color: #fafafa; padding: 12px 16px; border-radius: 6px; border: 1px dashed #e0e0e0;">
            ${itemsText}
        </div>

        <p style="margin-top: 24px; line-height: 1.6; font-size: 14px; color: #555555;">Vui lòng truy cập trang quản trị Admin FoneStore để xác nhận và tiến hành đóng gói giao nhận cho đơn vị vận chuyển.</p>
    `;

    console.log("Danh sách hòm thư nhận thông báo đơn hàng mới (Staff & Admin):", recipientEmails);

    const promises = recipientEmails.map(async (email) => {
        const templateParams = {
            to_email: email,
            email: email, // Đồng bộ với {{email}} trên giao diện EmailJS
            notification_title: "THÔNG BÁO ĐƠN HÀNG MỚI",
            message_content: htmlContent,
            subject: `[FoneStore Staff] Đơn hàng mới cần xử lý #${orderId}`
        };

        try {
            return await window.emailjs.send(
                emailjsConfig.serviceId,
                emailjsConfig.templates.staffOrderNotification,
                templateParams
            );
        } catch (err) {
            console.error(`Lỗi gửi EmailJS đến nhân viên/admin (${email}):`, err);
            return null;
        }
    });

    return await Promise.all(promises);
}

// 4. Gửi báo cáo đơn hàng chưa hoàn thành cuối ngày (5:00 PM) (Dùng chung mẫu template_staff_order)
export async function sendDailyIncompleteOrdersSummary(emailList, summaryContent) {
    await initEmailJS();

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

    console.log("Gửi báo cáo các đơn hàng tồn đọng cuối ngày tới danh sách:", emailList);

    const promises = emailList.map(async (email) => {
        const templateParams = {
            to_email: email,
            email: email, // Đồng bộ với {{email}} trên giao diện EmailJS
            notification_title: `BÁO CÁO ĐƠN HÀNG CHƯA HOÀN THÀNH - ${reportDate}`,
            message_content: htmlContent,
            subject: `[FoneStore Daily Summary] Báo cáo các đơn hàng chưa hoàn thành cần xử lý`
        };

        try {
            return await window.emailjs.send(
                emailjsConfig.serviceId,
                emailjsConfig.templates.staffOrderNotification,
                templateParams
            );
        } catch (err) {
            console.error(`Lỗi gửi EmailJS báo cáo cuối ngày đến (${email}):`, err);
            return null;
        }
    });

    return await Promise.all(promises);
}
