import { db } from './config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const phoneProducts = [
    { name: "iPhone 15 Pro Max", price: 29000000, img: "iphone15.jpg", desc: "Chip A17 Pro mạnh mẽ" },
    { name: "Samsung Galaxy S24 Ultra", price: 26000000, img: "s24.jpg", desc: "Camera 200MP AI" }
];

async function seedData() {
    const colRef = collection(db, "products");
    for (const item of phoneProducts) {
        await addDoc(colRef, item);
    }
    console.log("Đã tải dữ liệu lên Firebase thành công!");
}
// Gọi hàm này 1 lần duy nhất rồi xóa đi
// seedData();