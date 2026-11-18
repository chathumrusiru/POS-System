
const $ = id => document.getElementById(id);

const money = value => "Rs. " + Number(value).toFixed(2);

function loadData(key, defaults) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaults;
    } catch {
        return defaults;
    }
}

function saveData() {
    localStorage.setItem("gm_products", JSON.stringify(products));
    localStorage.setItem("gm_customers", JSON.stringify(customers));
    localStorage.setItem("gm_orders", JSON.stringify(orders));
}

function newId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8);
}

let products = loadData("gm_products", [
    {id:"p1", name:"Classic Burger", category:"Burgers", price:850},
    {id:"p2", name:"Cheese Burger", category:"Burgers", price:1100},
    {id:"p3", name:"Chicken Burger", category:"Burgers", price:950},
    {id:"p4", name:"Double Beef Burger", category:"Burgers", price:1550},
    {id:"p5", name:"French Fries", category:"Fries", price:450},
    {id:"p6", name:"Cheese Fries", category:"Fries", price:650},
    {id:"p7", name:"Coca Cola", category:"Drinks", price:300},
    {id:"p8", name:"Orange Juice", category:"Drinks", price:450}
]);

let customers = loadData("gm_customers", [
    {id:"c1", name:"Walk-in Customer", phone:"", email:""},
    {id:"c2", name:"Kamal Perera", phone:"0771234567", email:"kamal@example.com"}
]);

let orders = loadData("gm_orders", []);
let cart = [];
let selectedCategory = "All";
let editingType = "";
let editingId = null;

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#39;"
    }[char]));
}

function refresh() {
    saveData();
    renderDashboard();
    renderMenu();
    renderCart();
    renderProducts();
    renderCustomers();
    renderOrders();
    renderCustomerSelect();
}

document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".nav-btn").forEach(b =>
            b.classList.remove("active")
        );
        document.querySelectorAll(".page").forEach(p =>
            p.classList.remove("active")
        );

        button.classList.add("active");
        $(button.dataset.page).classList.add("active");
        $("pageTitle").textContent = button.textContent;
    });
});

// Dashboard
function renderDashboard() {
    $("totalProducts").textContent = products.length;
    $("totalCustomers").textContent = customers.length;
    $("totalOrders").textContent = orders.length;

    const revenue = orders
        .filter(o => o.status !== "Cancelled")
        .reduce((sum, o) => sum + o.total, 0);

    $("totalRevenue").textContent = money(revenue);

    $("recentOrders").innerHTML = orders.length
        ? orders.slice(-5).reverse().map(o => `
            <p>
                <strong>${escapeHTML(o.id.slice(-8))}</strong>
                — ${escapeHTML(o.customerName)}
                — ${money(o.total)}
            </p>
        `).join("")
        : '<p class="empty">No orders yet.</p>';
}

function renderMenu() {
    const search = $("menuSearch").value.toLowerCase();

    const filtered = products.filter(p =>
        (selectedCategory === "All" ||
         p.category === selectedCategory) &&
        p.name.toLowerCase().includes(search)
    );

    $("menuGrid").innerHTML = filtered.length
        ? filtered.map(p => {
            const emoji = p.category === "Burgers" ? "🍔" :
                p.category === "Fries" ? "🍟" : "🥤";

            return `
                <div class="menu-card">
                    <div class="emoji">${emoji}</div>
                    <h3>${escapeHTML(p.name)}</h3>
                    <p>${money(p.price)}</p>
                    <button class="primary"
                        onclick="addToCart('${p.id}')">
                        Add to Cart
                    </button>
                </div>
            `;
        }).join("")
        : '<p class="empty">No products found.</p>';
}

$("menuSearch").addEventListener("input", renderMenu);

document.querySelectorAll(".category").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".category").forEach(b =>
            b.classList.remove("active")
        );
        button.classList.add("active");
        selectedCategory = button.dataset.category;
        renderMenu();
    });
});

// Cart
function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const item = cart.find(i => i.productId === id);

    if (item) {
        item.quantity++;
    } else {
        cart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }

    renderCart();
}

function changeQuantity(id, amount) {
    const item = cart.find(i => i.productId === id);
    if (!item) return;

    item.quantity += amount;

    if (item.quantity <= 0) {
        cart = cart.filter(i => i.productId !== id);
    }

    renderCart();
}

function getCartTotal() {
    return cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );
}

function renderCart() {
    $("cartItems").innerHTML = cart.length
        ? cart.map(item => `
            <div class="cart-item">
                <div>
                    <strong>${escapeHTML(item.name)}</strong>
                    <p>${money(item.price * item.quantity)}</p>
                </div>
                <div>
                    <button onclick="changeQuantity('${item.productId}',-1)">−</button>
                    ${item.quantity}
                    <button onclick="changeQuantity('${item.productId}',1)">+</button>
                </div>
            </div>
        `).join("")
        : '<p class="empty">Cart is empty.</p>';

    $("subtotal").textContent = money(getCartTotal());
    $("grandTotal").textContent = money(getCartTotal());
}

$("clearCartBtn").addEventListener("click", () => {
    cart = [];
    renderCart();
});

function renderCustomerSelect() {
    const current = $("orderCustomer").value;

    $("orderCustomer").innerHTML = customers.map(c => `
        <option value="${c.id}">${escapeHTML(c.name)}</option>
    `).join("");

    if (customers.some(c => c.id === current)) {
        $("orderCustomer").value = current;
    }
}

$("checkoutBtn").addEventListener("click", () => {
    if (!cart.length) {
        alert("Please add products to the cart.");
        return;
    }

    const customer = customers.find(
        c => c.id === $("orderCustomer").value
    );

    if (!customer) {
        alert("Please add or select a customer.");
        return;
    }

    const order = {
        id: newId(),
        customerId: customer.id,
        customerName: customer.name,
        items: cart.map(i => ({...i})),
        total: getCartTotal(),
        status: "Completed",
        date: new Date().toISOString()
    };

    orders.push(order);
    cart = [];
    refresh();
    printReceipt(order);
});

// Products CRUD
function renderProducts() {
    const search = $("productSearch").value.toLowerCase();

    $("productTable").innerHTML = products
        .filter(p => p.name.toLowerCase().includes(search))
        .map(p => `
            <tr>
                <td>${escapeHTML(p.name)}</td>
                <td>${escapeHTML(p.category)}</td>
                <td>${money(p.price)}</td>
                <td>
                    <button class="action-btn"
                        onclick="openProduct('${p.id}')">Edit</button>
                    <button class="action-btn"
                        onclick="deleteProduct('${p.id}')">Delete</button>
                </td>
            </tr>
        `).join("");
}

$("productSearch").addEventListener("input", renderProducts);
$("addProductBtn").addEventListener("click", () => openProduct());

function openProduct(id = null) {
    editingType = "product";
    editingId = id;
    const p = products.find(x => x.id === id);

    $("modalTitle").textContent = p ? "Edit Product" : "Add Product";
    $("modalFields").innerHTML = `
        <label>Product Name</label>
        <input name="name" required value="${escapeHTML(p?.name || "")}">

        <label>Category</label>
        <select name="category">
            ${["Burgers","Fries","Drinks"].map(c => `
                <option value="${c}" ${p?.category === c ? "selected" : ""}>
                    ${c}
                </option>
            `).join("")}
        </select>

        <label>Price (Rs.)</label>
        <input name="price" type="number" min="0.01" step="0.01"
            required value="${p?.price ?? ""}">
    `;
    showModal();
}

function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;
    products = products.filter(p => p.id !== id);
    cart = cart.filter(i => i.productId !== id);
    refresh();
}

function renderCustomers() {
    const search = $("customerSearch").value.toLowerCase();

    $("customerTable").innerHTML = customers
        .filter(c => c.name.toLowerCase().includes(search))
        .map(c => `
            <tr>
                <td>${escapeHTML(c.name)}</td>
                <td>${escapeHTML(c.phone)}</td>
                <td>${escapeHTML(c.email)}</td>
                <td>
                    <button class="action-btn"
                        onclick="openCustomer('${c.id}')">Edit</button>
                    <button class="action-btn"
                        onclick="deleteCustomer('${c.id}')">Delete</button>
                </td>
            </tr>
        `).join("");
}

$("customerSearch").addEventListener("input", renderCustomers);
$("addCustomerBtn").addEventListener("click", () => openCustomer());

function openCustomer(id = null) {
    editingType = "customer";
    editingId = id;
    const c = customers.find(x => x.id === id);

    $("modalTitle").textContent = c ? "Edit Customer" : "Add Customer";
    $("modalFields").innerHTML = `
        <label>Customer Name</label>
        <input name="name" required value="${escapeHTML(c?.name || "")}">

        <label>Phone</label>
        <input name="phone" type="tel"
            value="${escapeHTML(c?.phone || "")}">

        <label>Email</label>
        <input name="email" type="email"
            value="${escapeHTML(c?.email || "")}">
    `;
    showModal();
}

function deleteCustomer(id) {
    if (!confirm("Delete this customer?")) return;
    customers = customers.filter(c => c.id !== id);
    refresh();
}
function renderOrders() {
    $("orderTable").innerHTML = orders.length
        ? orders.slice().reverse().map(o => `
            <tr>
                <td>${escapeHTML(o.id.slice(-8))}</td>
                <td>${escapeHTML(o.customerName)}</td>
                <td>${money(o.total)}</td>
                <td>${escapeHTML(o.status)}</td>
                <td>
                    <button class="action-btn"
                        onclick="viewOrder('${o.id}')">View</button>
                    <button class="action-btn"
                        onclick="editOrder('${o.id}')">Edit</button>
                    <button class="action-btn"
                        onclick="deleteOrder('${o.id}')">Delete</button>
                </td>
            </tr>
        `).join("")
        : '<tr><td colspan="5">No orders yet.</td></tr>';
}

function viewOrder(id) {
    const o = orders.find(x => x.id === id);
    if (!o) return;

    alert(
        "Order: " + o.id +
        "\nCustomer: " + o.customerName +
        "\n\n" + o.items.map(i =>
            i.name + " x " + i.quantity +
            " = " + money(i.price * i.quantity)
        ).join("\n") +
        "\n\nTotal: " + money(o.total) +
        "\nStatus: " + o.status
    );
}

function editOrder(id) {
    const o = orders.find(x => x.id === id);
    if (!o) return;

    editingType = "order";
    editingId = id;
    $("modalTitle").textContent = "Edit Order";

    $("modalFields").innerHTML = `
        <label>Customer</label>
        <select name="customerId">
            ${customers.map(c => `
                <option value="${c.id}"
                    ${c.id === o.customerId ? "selected" : ""}>
                    ${escapeHTML(c.name)}
                </option>
            `).join("")}
        </select>

        <label>Order Status</label>
        <select name="status">
            ${["Pending","Completed","Cancelled"].map(s => `
                <option value="${s}"
                    ${o.status === s ? "selected" : ""}>${s}</option>
            `).join("")}
        </select>

        <h3>Order Items</h3>
        ${o.items.map((i, index) => `
            <label>${escapeHTML(i.name)} - ${money(i.price)}</label>
            <input type="number" name="qty_${index}"
                min="0" step="1" required value="${i.quantity}">
        `).join("")}
        <p>Set quantity to 0 to remove an item.</p>
    `;

    showModal();
}

function deleteOrder(id) {
    if (!confirm("Delete this order?")) return;
    orders = orders.filter(o => o.id !== id);
    refresh();
}

// Modal
function showModal() {
    $("modal").classList.remove("hidden");
}

function closeModal() {
    $("modal").classList.add("hidden");
}

$("closeModal").addEventListener("click", closeModal);

$("modal").addEventListener("click", e => {
    if (e.target === $("modal")) closeModal();
});

$("modalForm").addEventListener("submit", e => {
    e.preventDefault();

    const data = new FormData(e.target);

    if (editingType === "product") {
        const name = String(data.get("name")).trim();
        const price = Number(data.get("price"));

        if (!name || !Number.isFinite(price) || price <= 0) {
            alert("Enter a valid name and price.");
            return;
        }

        const p = {
            id: editingId || newId(),
            name,
            category: data.get("category"),
            price
        };

        if (editingId) {
            products = products.map(x => x.id === editingId ? p : x);
        } else {
            products.push(p);
        }
    }

    if (editingType === "customer") {
        const name = String(data.get("name")).trim();
        if (!name) return;

        const c = {
            id: editingId || newId(),
            name,
            phone: String(data.get("phone")).trim(),
            email: String(data.get("email")).trim()
        };

        if (editingId) {
            customers = customers.map(x => x.id === editingId ? c : x);
        } else {
            customers.push(c);
        }
    }

    if (editingType === "order") {
        const o = orders.find(x => x.id === editingId);
        const customer = customers.find(
            c => c.id === data.get("customerId")
        );

        if (!o || !customer) {
            alert("Please select a valid customer.");
            return;
        }

        const items = [];

        for (let index = 0; index < o.items.length; index++) {
            const quantity = Number(data.get("qty_" + index));

            if (!Number.isInteger(quantity) || quantity < 0) {
                alert("Quantities must be whole numbers.");
                return;
            }

            if (quantity > 0) {
                items.push({...o.items[index], quantity});
            }
        }

        if (!items.length) {
            alert("An order must contain at least one item.");
            return;
        }

        o.items = items;
        o.customerId = customer.id;
        o.customerName = customer.name;
        o.status = data.get("status");
        o.total = items.reduce(
            (sum, i) => sum + i.price * i.quantity, 0
        );
    }

    closeModal();
    refresh();
});

function printReceipt(order) {
    const receipt = `
        <html>
        <head><title>GrillMaster Receipt</title></head>
        <body style="font-family:Arial;padding:25px">
            <h2>🍔 GrillMaster POS</h2>
            <p>Order: ${escapeHTML(order.id)}</p>
            <p>Date: ${escapeHTML(new Date(order.date).toLocaleString())}</p>
            <p>Customer: ${escapeHTML(order.customerName)}</p>
            <hr>
            ${order.items.map(i => `
                <p>${escapeHTML(i.name)} x ${i.quantity}
                - ${money(i.price * i.quantity)}</p>
            `).join("")}
            <hr>
            <h3>Total: ${money(order.total)}</h3>
            <p>Thank you for your order!</p>
        </body>
        </html>
    `;

    const win = window.open("", "_blank");

    if (win) {
        win.document.write(receipt);
        win.document.close();
        win.focus();
        win.print();
    } else {
        alert("Order saved. Allow pop-ups to print the receipt.");
    }
}

refresh();
