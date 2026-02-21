const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 8000;

require('events').EventEmitter.defaultMaxListeners = 500;

// Routes
const pairRoute = require('./pair');

app.use('/code', pairRoute);
app.use('/pair', (req, res) => res.sendFile(path.join(__dirname, 'pair.html')));
app.use('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.use('/', (req, res) => res.sendFile(path.join(__dirname, 'main.html')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(PORT, () => {
    console.log(`
╭──────────────────────────╮
│   🤖 SHANUWA MINI BOT    │
│   🚀 Version: 6.0.0      │
│   🌐 Port: ${PORT}          │
│   👑 Owner: Shanuka      │
╰──────────────────────────╯
    `);
});

module.exports = app;