# Smekenshop Backend
Selamat datang di Smekenshop Backend. Smekenshop adalah sebuah proyek yang dibuat untuk mengikuti lomba INOTEK 2025.

## Dokumentasi
Selamat datang di dokumentasi endpoint, semua endpoint membutuhkan autentikasi dengan parameter server_id

### Endpoint /account/update (POST)
Endpoint untuk memperbarui informasi akun

Required parameter:
<pre>account_id, email, field, new_value, action</pre>

- teruntuk parameter account_id dan email, silahkan pilih salah satu
- field: field manakah yang ingin diperbarui (field yang tersedia: id, name, rating, email, password, login_type, profile_photo)
- new_value: nilai baru untuk diterapkan
- action: aksi apa yang akan Anda lakukan (tersedia: set, unset)
- password: dibutuhkan jika Anda ingin mengubah kata sandi akun (field=password)

Mengembalikan hasil id atau email

⚠️ Anda tidak dapat memperbarui field id dan login_type

### Endpoint /account/update/profile (POST)
Digunakan untuk memperbarui foto profil pengguna, permintaan melalui form-data

Required parameter:
<pre>account_id, email</pre>

- teruntuk parameter account_id dan email, silahkan pilih salah satu

Mengembalikan hasil id atau email

### Endpoint /auth/
Endpoint untuk mendaftar dan masuk

<b><u>Melalui FORM</u></b>

Tersedia:

<b>/auth/signup (POST)</b>

Untuk mendaftarkan akun baru

Required parameter:
<pre>name, email, password</pre>

Mengembalikan hasil JWT berisi id akun (silahkan verifikasi dengan endpoint /auth/verify)

<b>/auth/signin (POST)</b>

Untuk masuk ke sebuah akun

Required parameter:
<pre>email, password</pre>

Mengembalikan hasil JWT berisi id akun (silahkan verifikasi dengan endpoint /auth/verify)

<b><u>Melalui GOOGLE</u></b>

<b>/auth/google/authorize (POST)</b>

Masuk dengan google

Required parameter:
<pre>-</pre>

Mengembalikan hasil berupa URL autentikasi

<b>/auth/google/callback (POST)</b>

Untuk menerima umpan balik hasil yang diberikan google.

Required parameter:
<pre>code, state</pre>

- code: hasil generate otomatis
- state: kustom state berisi request_id (request_id tidak boleh dimodifikasi)

Mengembalikan hasil JWT berisi id akun (silahkan verifikasi dengan endpoint /auth/verify)

### Endpoint /product/upload (POST)
Endpoint ini untuk mengunggah file ke google drive dan menyimpan informasi produk ke mongodb. Permintaan dilakukan melalui form-data dengan buffer file dan parameter.

Required parameter:
<pre>name, description, category, price, seller_id</pre>

- name: nama produk
- description: deskripsi produk (max: unlimited)
- price: harga produk
- seller_id: ID unik pada setiap akun

Optional parameter (digunakan pada keadaan tertentu):
<pre>action, product_id, old_file_id</pre>

- action: aksi (update)
- product_id: ID unik pada setiap produk, digunakan untuk memperbarui daftar products
- old_file_id: file ID lama untuk menentukan produk mana yang akan diubah (String/Array)

<pre>Contoh parameter old_file_id
Array: ['some_id_1','some_id_2']
String: 'some_id'
</pre>

Mengembalikan hasil berupa id produk, silahkan verifikasi ke /product/verify

## Endpoint /product/update (POST)
Digunakan untuk memperbarui data produk, kecuali jika ingin menambah gambar (gunakan /product/upload)

Required parameter:
<pre>seller_id, product_id, field, action</pre>
- seller_id: ID unik pada setiap akun
- product_id: ID unik pada setiap produk
- field: data yang ingin diperbarui
- action: aksi yang ingin dilakukan (set, unset, pull, push)

Optional parameter (gunakan pada kondisi tertentu seperti update)
<pre>new_value, old_file_id</pre>

- new_value: nilai baru untuk diterapkan
- old_file_id: file_id lama, gunakan ini jika Anda ingin menghapus produk dalam daftar produk (fields=products)

Mengembalikan hasil berupa id produk, silahkan verifikasi ke /product/verify

## Endpoint /product/remove (POST)
Gunakan jika ingin menghapus produk

Require parameter:
<pre>seller_id, product_id</pre>

- seller_id: ID unik pada setiap akun
- product_id: ID unik pada setiap produk

## Endpoint /auth/verify (POST)
Digunakan untuk mendapatkan informasi lengkap akun, membutuhkan JWT

Required parameter:
<pre>token</pre>

- token: JWT yang didapat ketika signup atau signin

Mengembalikan hasil berupa informasi akun

## Endpoint /product/verify (POST)
Untuk mendapatkan informasi produk

Required parameter:
<pre>seller_id, email, product_id</pre>

- teruntuk seller_id (id akun) dan email, silahkan pilih salah satu
- product_id: ID unik pada setiap produk

Mengembalikan hasil berupa informasi produk