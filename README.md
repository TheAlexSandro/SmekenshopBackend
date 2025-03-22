# Smekenshop Backend
Selamat datang di Smekenshop Backend. Smekenshop adalah sebuah proyek yang dibuat untuk mengikuti lomba INOTEK 2025.

## Dokumentasi
Selamat datang di dokumentasi endpoint, semua endpoint membutuhkan autentikasi dengan parameter server_id

## Struktural
Berikut adalah struktur json daripada database pengguna dan produk

### Pengguna:
<pre>
{
    role,
    id,
    name,
    email,
    interaction,
    instance,
    whatsapp,
    profile_photo,
    password,
    products: [
        'some id'
    ],
    statistics: {
        total_interaction,
        total_like
    }
}
</pre>

### Produk
<pre>
{
    status,
    product_id,
    product_name,
    description,
    price,
    release_date,
    category,
    like,
    view,
    interaction,
    images: [
        {
            file_name,
            file_id
        }
    ],
    seller: {
        seller_id
    }
}
</pre>

## Errors
Berikut adalah daftar kesalahan lengkap beserta deskripsinya

### Legenda
- ❌ = Tidak digunakan
- ⚠️ = Akan dihapus
- ✅ = Digunakan
- ❕ = Akan digunakan
- 🖥 = Hanya dalam development

| Kode HTTP | Kode Kesalahan                 | Deskripsi               | Status                   |
| :-------: | ------------------------------ | ----------------------- | :----------------------: |
| 403       | `CORS_FORBIDDEN_ACCESS`        | Akses ditolak oleh CORS | 🖥 |
| 403       | `ACCESS_DENIED`                | Request tidak memiliki nilai pada parameter server_id | ✅ |
| 403       | `HTTP_METHOD_REQUEST`          | Metode permintaan Anda tidak diterima | ✅ |
| 403       | `FORBIDDEN_FIELD`              | Anda tidak memiliki izin untuk mengedit field tertentu | ✅ |
| 403       | `FORBIDDEN_UPDATE_REQUEST`     | Pembaruan data tidak diizinkan, karena berada dalam status tertentu | ✅ |
| 401       | `UNAUTHORIZED_CLERENCE`        | Anda tidak memiliki izin untuk memasuki area tertentu | ❌ |
| 401       | `UNAUTHORIZED_REQUEST`         | Ketika Anda mencoba memperbarui sesuatu, tetapi Anda belum login |❕|
| 401       | `UNAUTHORIZED_ACCESS_PASSWORD` | Kata sandi akun salah | ✅ |
| 401       | `UNAUTHORIZED_ACCESS_SERVER`   | server_id tidak dapat diterima | ⚠️ |
| 401       | `UNAUTHORIZED_ACCESS_TOKEN`    | Token JWT yang diberikan tidak dapat dipergunakan | ✅ |
| 401       | `UNAUTHORIZED`                 | Kode untuk pesan error kustom | ✅ |
| 400       | `MISSING_PARAMETERS`           | Parameter yang diberikan kurang dari jumlah yang dibutuhkan | ✅ |
| 400       | `USER_AVAILABLE`               | Pengguna sudah ada dalam basis data, ini terjadi ketika Anda membuat akun dengan email yang sudah ada | ✅ |
| 400       | `REQUEST_ID_INVALID`           | ID Permintaan tidak dapat diterima | ⚠️ |
| 400       | `MISSING_FILE`                 | Tidak file yang harus diunggah | ✅ |
| 400       | `DOUBLE_PARAMETER_DATA`        | Anda harus memilih 1 dari 2 parameter yang memuat fungsi sama | ✅ |
| 400       | `PARAMETER_CANNOT_EMPTY`       | Jika Anda menggunakan parameter opsional, maka nilainya tidak boleh kosong | ✅ |
| 400       | `EMPTY_PRODUCT`                | Tidak ada produk yang tersedia dalam database | ✅ |
| 400       | `UNKNOWN_ERROR`                | Kode untuk pesan error kustom | ✅ |
| 404       | `USER_NOT_FOUND`               | Pengguna tidak ada dalam database | ✅ |
| 404       | `USER_JWT_FOUND`               | Token JWT tersedia, tetapi akun pengguna tidak ada (rare) | ✅ |
| 404       | `UPLOAD_CANCEL`                | Anda mencoba mengunggah produk dengan akun yang tidak ada dalam database? | ✅ |
| 404       | `PRODUCT_NOT_FOUND`            | Produk tidak tersedia dengan ID produk yang diberikan | ✅ |
| 404       | `PRODUCT_INVALID`              | Pengguna ini tidak memiliki produk dengan ID produk yang Anda berikan | ✅ |
| 404       | `PRODUCT_LIST_NOT_FOUND`       | Tidak ada daftar produk dalam status yang Anda berikan | ✅ |
| 404       | `PRODUCT_REVIEW_NOT_FOUND`     | ID produk yang Anda berikan tidak dalam status yang Anda berikan | ✅ |
| 404       | `NOT_FOUND`                    | Kode untuk pesan error kustom | ✅ |

## Endpoint
Berikut adalah beberapa endpoint yang tersedia:

### Endpoint /account/update (POST)
Endpoint untuk memperbarui informasi akun. <b><ins>Permintaan melalui form-data</ins></b>

Required parameter:
<pre>-</pre>

Optional parameter:
<pre>id, email, data, action</pre>

- id/email: gunakan ID unik akun atau email pengguna
- data: data field yang akan diperbarui (harus berbentuk JSON, misal: {name:"me",whatsapp:"123456789"}. ⚠️ Jangan pernah mengirim JSON seperti: "{data json}" (dengan petik diantara data JSON) = format salah)
- action: aksi yang akan dilakukan (tersedia: update dan remove)

ℹ️ Anda dapat menggunakan parameter data dan upload file bersamaan atau gunakan terpisah (endpoint ini mendukung pembaruan data bersamaan).

<b>Action Terminology</b>

Hanya mendukung single action.

- "update" = memperbarui foto profile (gunakan aksi ini untuk upload profile)
- "remove" = menghapus foto profile (jika Anda menggunakan aksi ini, maka Anda tidak perlu mengupload gambar)

<b>Data JSON Terminology</b>

Untuk memperbarui field interaction, Anda tidak perlu memberikan value, misal:

Dengan field lain:
<pre>
{name:"saya",interaction}
</pre>

Tanpa field lain:
<pre>
{interaction}
</pre>

<i><ins>Penempatan Field</ins></i>
✅
- <code>{name:"saya",interaction}</code>
- <code>{interaction}</code>

❌
- <code>{interaction,name:"saya"}</code>

⚠️ Jangan pernah menaruh field yang memiliki nilai di belakang field tanpa nilai.

⚠️ Anda tidak dapat memperbarui field id dan role disini.

Mengembalikan hasil id atau email
### Endpoint /account/role (POST)
Gunakan ini untuk memperbarui role pengguna

Required parameter:
<pre>id, role</pre>

- id: ID unik pada setiap akun
- role: peran yang diinisiasikan (tersedia: user, admin, dan banned)

Mengembalikan hasil berupa id akun, silahkan verifikasi ke /verify/account

### Endpoint /auth/
Endpoint untuk mendaftar dan masuk

Tersedia:

<b>/auth/signup (POST)</b>

Untuk mendaftarkan akun baru

Required parameter:
<pre>name, email, password</pre>

Optional parameter:
<pre>instance, whatsapp</pre>

- instance: siswa atau guru
- whatsapp: nomor telepon (wa)

Mengembalikan hasil JWT berisi id akun (silahkan verifikasi dengan endpoint /verify/token)

<b>/auth/signin (POST)</b>

Untuk masuk ke sebuah akun

Required parameter:
<pre>email, password</pre>

Mengembalikan hasil JWT berisi id akun (silahkan verifikasi dengan endpoint /verify/token)

<b>/auth/signout (POST)</b>

Required parameter:
<pre>access_token</pre>

- access_token: access token pada akun yang akan di signout

### Endpoint /product/list (POST)
Digunakan untuk mendapatkan daftar produk dalam status tertentu.

Required parameter:
<pre>status</pre>

- status: status produk (approved, rejected, pendings)

Optional parameter:
<pre>seller_id</pre>

- seller_id: ID unik pada setiap akun

Jika Anda menambahkan seller_id, mada akan mengembalikan produk dalam scope seller_id, jika Anda tidak menggunakannnya maka akan mengambalikan semua produk dalam status yang diberikan.

### Endpoint /product/review (POST)
Untuk melakukan peninjauan (tolak atau terima) terhadap produk tertentu.

Required parameter:
<pre>product_id, action</pre>

- product_id: ID unik pada setiap produk
- action: aksi yang akan diberikan (tersedia: approve dan reject)

Optional parameter:
<pre>message, status</pre>

- message: pesan/saran yang ingin Anda berikan ke pengguna
- status: status produk saat ini (approved, rejected, pendings)

⚠️ Pencarian akan dilakukan di 3 collection (global) jika tidak ada status yang diberikan.

Mengembalikan id produk, silahkan verifikasi ke /verify/product

### Endpoint /product/upload (POST)
Endpoint ini untuk mengunggah file ke google drive dan menyimpan informasi produk ke firestore. Permintaan dilakukan melalui form-data dengan buffer file dan parameter.

Required parameter:
<pre>name, description, category, price, seller_id</pre>

- name: nama produk
- description: deskripsi produk (max: unlimited)
- price: harga produk
- seller_id: ID unik pada setiap akun

Mengembalikan hasil berupa id produk, silahkan verifikasi ke /verify/product

### Endpoint /product/update (POST)
Digunakan untuk memperbarui data produk, kecuali jika ingin menambah gambar (gunakan /product/upload). Jika Anda ingin menghapus beberapa gambar pada produk, gunakan endpoint ini. <b>Untuk memperbarui like dan interaction gunakan endpoint ini</b> dan <b><ins>permintaan harus dilakukan melalui form-data</b></ins>

Setiap permintaan yang membutuhkan upload gambar harus memiliki parameter action.

Required parameter:
<pre>seller_id, product_id, status</pre>

- seller_id: ID unik pada setiap akun
- product_id: ID unik pada setiap produk
- status: status produk (approved, rejected, pendings)

Optional parameter (gunakan pada kondisi tertentu seperti update)
<pre>data, file, action, old_file_id</pre>

- data: data field yang akan diperbarui (harus berbentuk JSON, misal: {product_name:"test",description:"lorem ipsum"}. ⚠️ Jangan pernah mengirim JSON seperti: "{data json}" (dengan petik diantara data JSON) = format salah)
- file: buffer file yang akan disimpan
- action: aksi yang ingin dilakukan (tersedia: add, update dan remove)
- old_file_id: file_id lama, gunakan ini jika Anda ingin menghapus gambar atau memperbarui gambar dalam daftar produk (single/double)

ℹ️ Anda dapat menggunakan parameter data dan upload file bersamaan atau gunakan terpisah (endpoint ini mendukung pembaruan data bersamaan).

<b>Data JSON Terminology</b>

Untuk memperbarui field interaction dan like, Anda tidak perlu memberikan value, misal:

Dengan field lain:
<pre>
{product_name:"Bakso",interaction,like}
</pre>

Tanpa field lain:
<pre>
{interaction,like}
</pre>

<ins>Untuk memperbarui stock gunakan field {stock} atau {stock:"12"}</ins>
- {stock} hanya untuk mengurangi jumlah stok [-1]
- {stock:"12"} untuk menambah stok produk saat ini

<i><ins>Penempatan Field</ins></i>
✅
- <code>{product_name:"Bakso",interaction,like}</code>
- <code>{interaction,like}</code>

❌
- <code>{interaction,product_name:"Bakso"}</code>

⚠️ Jangan pernah menaruh field yang memiliki nilai di belakang field tanpa nilai.

<b>Action Terminology</b>

- "add" = menambahkan gambar ke produk
- "update" = memperbarui gambar, misal: Anda ingin memperbarui (mengganti) gambar A, maka gunakan action ini
- "remove" = digunakan untuk menghapus gambar (Anda perlu mengupload gambar jika menggunakan aksi ini)

Parameter action mendukung single (1 aksi) atau array (beberapa aksi, pisahkan dengan "," (koma)), contoh:

<pre>
Single: add
Double: add,update
</pre>

<b>old_file_id Terminology</b>

Contoh parameter old_file_id
<pre>
Single: some_id
Double: [some_id_1,some_id_2]
</pre>

⚠️ Jika Anda hanya ingin memperbarui data dan tidak mengupload file, tidak perlu menggunakan parameter action dan old_file_id.

Mengembalikan hasil berupa id produk, silahkan verifikasi ke /verify/product

### Endpoint /product/remove (POST)
Gunakan jika ingin menghapus produk

Require parameter:
<pre>seller_id, product_id, status</pre>

- seller_id: ID unik pada setiap akun
- product_id: ID unik pada setiap produk
- status: status produk (approved, rejected, pendings)

### Endpoint /product/summary (POST)
Digunakan untuk mendapatkan daftar produk secara acak.

Required parameter:
<pre>-</pre>

Optional parameter:
<pre>limit</pre>

- limit: batasan seberapa banyak produk yang akan diambil. Jika tidak ada, maka hanya akan mengembalikan 20 produk

Mengembalikan hasil produk dari urutan penjumlahan (like, view, interaction) terbanyak.

### Endpoint /product/find (POST)
Digunakan untuk mencari produk sesuai kueri yang dimasukkan.

Required parameter:
<pre>-</pre>

Optional parameter:
<pre>query, category</pre>

Mengembalikan hasil dari nama produk yang memiliki kecocokan/kemiripan dengan kueri atau kategori, jika tidak ada produk yang memiliki kecocokan/kemiripan maka akan mengembalikan product summary.

### Endpoint /verify/token (POST)
Digunakan untuk mendapatkan informasi lengkap akun, membutuhkan JWT

Required parameter:
<pre>access_token</pre>

- token: JWT yang didapat ketika signup atau signin

Mengembalikan hasil berupa informasi akun

### Endpoint /verify/product (POST)
Untuk mendapatkan informasi produk

Required parameter:
<pre>seller_id, email, product_id</pre>

- teruntuk seller_id (id akun) dan email, silahkan pilih salah satu
- product_id: ID unik pada setiap produk

Optional parameter:
<pre>status</pre>

- status: status produk (tersedia: approved, rejected dan pendings)

⚠️ Pencarian akan dilakukan di 3 collection (global) jika tidak ada status yang diberikan.

Mengembalikan hasil berupa informasi produk

### Endpoint /verify/account (POST)
Untuk mendapatkan informasi akun (tanpa JWT).

Required parameter:
<pre>account_id, email</pre>

- teruntuk account_id dan email, silahkan pilih salah satu

Mengembalikan informasi akun (tanpa password).