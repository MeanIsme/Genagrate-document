const app = require('./src/app');
const port = 3000;

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
