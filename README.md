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

Untuk memperbarui field interactions, Anda tidak perlu memberikan value, misal:

Dengan field lain:
<pre>
{name:"saya",interactions}
</pre>

Tanpa field lain:
<pre>
{interactions}
</pre>

Mengembalikan hasil id atau email

⚠️ Anda tidak dapat memperbarui field id dan role disini.

### Endpoint /account/role (POST)
Gunakan ini untuk memperbarui role pengguna

Required parameter:
<pre>id, role</pre>

- id: ID unik pada setiap akun
- role: peran yang diinisiasikan (tersedia: user dan admin)

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

- status: status produk (approved, rejected, pending)

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
- status: status produk saat ini (approved, rejected, pending)

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
- status: status produk (approved, rejected, pending)

Optional parameter (gunakan pada kondisi tertentu seperti update)
<pre>data, file, action, old_file_id</pre>

- data: data field yang akan diperbarui (harus berbentuk JSON, misal: {product_name:"test",description:"lorem ipsum"}. ⚠️ Jangan pernah mengirim JSON seperti: "{data json}" (dengan petik diantara data JSON) = format salah)
- file: buffer file yang akan disimpan
- action: aksi yang ingin dilakukan (tersedia: add, update dan remove)
- old_file_id: file_id lama, gunakan ini jika Anda ingin menghapus gambar atau memperbarui gambar dalam daftar produk (single/double)

ℹ️ Anda dapat menggunakan parameter data dan upload file bersamaan atau gunakan terpisah (endpoint ini mendukung pembaruan data bersamaan).

<b>Data JSON Terminology</b>

Untuk memperbarui field interactions dan like, Anda tidak perlu memberikan value, misal:

Dengan field lain:
<pre>
{product_name:"saya",interactions,like}
</pre>

Tanpa field lain:
<pre>
{interactions,like}
</pre>

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
- status: status produk (approved, rejected, pending)

### Endpoint /product/summary (POST)
Digunakan untuk mendapatkan daftar produk berdasarkan like, view dan interaction.
Semua produk dibandingkan dengan menjumlahkan like, view dan interaction lalu mengurutkan dari jumlah yang paling banyak.

⚠️ Jika semua produk memiliki like = 0, view = 0, interaction = 0 atau tidak ada produk dalam database. Maka tidak akan mengembalikan hasil apa-apa.

Required parameter:
<pre>-</pre>

Mengembalikan hasil produk dari urutan penjumlahan (like, view, interaction) terbanyak.

### Endpoint /product/find (POST)
Digunakan untuk mencari produk sesuai kueri yang dimasukkan.

Required parameter:
<pre>query</pre>

Mengembalikan hasil dari nama produk yang memiliki kecocokan/kemiripan dengan kueri, jika tidak ada produk yang memiliki kecocokan/kemiripan maka akan mengembalikan product summary.

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