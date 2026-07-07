const http = require('http');

async function test() {
    try {
        const response = await fetch('http://localhost:3000/api/capsules/1/unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: '123' })
        });
        const data = await response.json();
        console.log("Response:", response.status, data);
    } catch(err) {
        console.error(err);
    }
}
test();
