const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.use('/api', routes);

// BUG: No error handling middleware
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
