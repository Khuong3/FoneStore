import { auth, db } from './config.js';
// QUAN TRỌNG: Phải import đầy đủ các hàm này từ Firebase
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import { 
    doc, 
    getDoc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/**
 * HÀM ĐĂNG NHẬP (Đã gộp và phân quyền)
 */
export async function handleLogin(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log(">>> Đăng nhập thành công:", user.email);

        // Lấy thông tin Role từ Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === "admin") {
                alert("Xin chào Quản trị viên!");
                // Nếu đang ở /pages/login.html thì vào admin/dashboard.html
                window.location.href = "./admin/dashboard.html"; 
            } else {
                alert("Chào mừng " + (userData.fullName || "bạn") + " quay trở lại!");
                window.location.href = "../index.html"; 
            }
        } else {
            window.location.href = "../index.html";
        }
    } catch (error) {
        console.error("Lỗi đăng nhập:", error.code);
        alert("Email hoặc mật khẩu không chính xác!");
    }
}

/**
 * HÀM ĐĂNG KÝ
 */
export async function handleRegister(email, password, additionalInfo) {
    console.log(">>> Đang bắt đầu quá trình đăng ký cho:", email);
    
    try {
        // Bước 1: Tạo tài khoản trên Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log(">>> Đã tạo tài khoản Auth thành công.");

        // Bước 2: Lưu thông tin vào Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: email,
            fullName: additionalInfo.fullName,
            phone: additionalInfo.phone,
            address: additionalInfo.address,
            role: "customer", // Mặc định là khách hàng
            createdAt: new Date()
        });
        
        console.log(">>> Đã lưu Firestore thành công!");
        alert("Đăng ký tài khoản thành công!");
        window.location.href = "../index.html"; 

    } catch (error) {
        console.error("Lỗi đăng ký:", error.code);
        let message = "Lỗi: " + error.message;
        if (error.code === 'auth/email-already-in-use') message = "Email này đã được sử dụng!";
        if (error.code === 'auth/weak-password') message = "Mật khẩu tối thiểu phải có 6 ký tự!";
        alert(message);
    }
}

/**
 * HÀM ĐĂNG XUẤT
 */
export async function handleLogout() {
    try {
        await signOut(auth);
        alert("Đã đăng xuất!");
        window.location.reload();
    } catch (error) {
        console.error("Lỗi đăng xuất:", error);
    }
}