import { auth, db } from './config.js'; // Đảm bảo đường dẫn đúng
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Hàm thêm sản phẩm vào giỏ hàng trên Firestore
window.addToCart = async function(productId, productName, productPrice, productImg) {
    const user = auth.currentUser;

    if (!user) {
        alert("Vui lòng đăng nhập để thực hiện chức năng này!");
        return;
    }

    try {
        const cartRef = doc(db, "carts", user.uid);
        const cartSnap = await getDoc(cartRef);
        
        let items = [];
        if (cartSnap.exists()) {
            items = cartSnap.data().items || [];
        }

        // Kiểm tra trùng sản phẩm
        const existingItem = items.find(item => item.id === productId);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            items.push({
                id: productId,
                name: productName,
                price: Number(productPrice),
                img: productImg,
                quantity: 1
            });
        }

        // Cập nhật lại Firestore
        await setDoc(cartRef, { items: items });
        
        alert(`Đã thêm ${productName} vào giỏ hàng hệ thống!`);
        updateCartIcon(); 

    } catch (error) {
        console.error("Lỗi thêm giỏ hàng:", error);
    }
};

// Hàm cập nhật icon giỏ hàng (Lấy số lượng từ DB)
export async function updateCartIcon() {
    const user = auth.currentUser;
    const cartCountElement = document.querySelector('#cart-info a');
    if (!cartCountElement || !user) return;

    const cartRef = doc(db, "carts", user.uid);
    const cartSnap = await getDoc(cartRef);
    
    if (cartSnap.exists()) {
        const items = cartSnap.data().items || [];
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        cartCountElement.innerText = `Giỏ hàng (${totalItems})`;
    }
}