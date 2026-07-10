const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({ message: 'Hello from the CI/CD Pipeline Demo!' });
});

// A simple function to test
function add(a, b) {
    return a + b;
}

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

module.exports = { app, add };

// Hello
