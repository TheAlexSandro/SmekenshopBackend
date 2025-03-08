# Smekenshop Backend
Selamat datang di Smekenshop Backend. Smekenshop adalah sebuah proyek yang dibuat untuk mengikuti lomba INOTEK 2025.

## Dokumentasi
Selamat datang di dokumentasi endpoint, semua endpoint membutuhkan autentikasi dengan parameter server_id

## Struktural
Berikut adalah struktur json daripada database pengguna dan produk

### Pengguna:
<pre>
{
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
    ]
}
</pre>

### Produk
<pre>
{
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
Endpoint untuk memperbarui informasi akun

Required parameter:
<pre>account_id, email, field, new_value, action</pre>

- teruntuk parameter account_id dan email, silahkan pilih salah satu
- field: field manakah yang ingin diperbarui (field yang tersedia: email, id instance, interaction, name, password, products, profile_photo, whatsapp)
- new_value: nilai baru untuk diterapkan
- action: aksi apa yang akan Anda lakukan (tersedia: set, remove)
- password: dibutuhkan jika Anda ingin mengubah kata sandi akun (field=password)

Mengembalikan hasil id atau email

⚠️ Anda tidak dapat memperbarui field id

### Endpoint /account/update/profile (POST)
Digunakan untuk memperbarui foto profil pengguna, permintaan melalui form-data

Required parameter:
<pre>account_id, email</pre>

- teruntuk parameter account_id dan email, silahkan pilih salah satu

Mengembalikan hasil id atau email

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

### Endpoint /product/upload (POST)
Endpoint ini untuk mengunggah file ke google drive dan menyimpan informasi produk ke firestore. Permintaan dilakukan melalui form-data dengan buffer file dan parameter.

Required parameter:
<pre>name, description, category, price, seller_id</pre>

- name: nama produk
- description: deskripsi produk (max: unlimited)
- price: harga produk
- seller_id: ID unik pada setiap akun

Optional parameter (digunakan pada keadaan tertentu):
<pre>action, product_id, old_file_id</pre>

- action: aksi (tersedia: update dan add)
- product_id: ID unik pada setiap produk
- old_file_id: file ID lama untuk menentukan gambar mana yang akan diubah (String/Array)

<pre>Contoh parameter old_file_id
Array: ['some_id_1','some_id_2']
String: 'some_id'
</pre>

Mengembalikan hasil berupa id produk, silahkan verifikasi ke /verify/product

### Endpoint /product/update (POST)
Digunakan untuk memperbarui data produk, kecuali jika ingin menambah gambar (gunakan /product/upload). Jika Anda ingin menghapus beberapa gambar pada produk, gunakan endpoint ini. <b>Untuk memperbarui like dan interaction gunakan endpoint ini.</b>

Jika Anda ingin memperbarui like atau interaction, tidak perlu menggunakan action.

Required parameter:
<pre>seller_id, product_id, field</pre>

- seller_id: ID unik pada setiap akun
- product_id: ID unik pada setiap produk
- field: field data yang ingin diperbarui

Optional parameter (gunakan pada kondisi tertentu seperti update)
<pre>new_value, action, old_file_id</pre>

- new_value: nilai baru untuk diterapkan
- action: aksi yang ingin dilakukan (tersedia: set dan remove)
- old_file_id: file_id lama, gunakan ini jika Anda ingin menghapus produk dalam daftar produk (field harus images)

Mengembalikan hasil berupa id produk, silahkan verifikasi ke /verify/product

### Endpoint /product/remove (POST)
Gunakan jika ingin menghapus produk

Require parameter:
<pre>seller_id, product_id</pre>

- seller_id: ID unik pada setiap akun
- product_id: ID unik pada setiap produk

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

Mengembalikan hasil berupa informasi produk

### Endpoint /verify/account (POST)
Untuk mendapatkan informasi akun (tanpa JWT).

Required parameter:
<pre>account_id, email</pre>

- teruntuk account_id dan email, silahkan pilih salah satu

Mengembalikan informasi akun (tanpa password).