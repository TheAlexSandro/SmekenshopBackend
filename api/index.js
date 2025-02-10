require('dotenv').config({ path: '.env' });
const app = require('./verify/route');
const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});