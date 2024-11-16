const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const { jsPDF } = require("jspdf");
require("jspdf-autotable");

const app = express();
const PORT = process.env.PORT || 3001; // Set the port to 3001

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Ensure this is correct

// Logging middleware
app.use((req, res, next) => {
    console.log(`Request: ${req.method} ${req.url}`);
    next();
});

// Connect to SQLite database
const db = new sqlite3.Database('inventory1.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Route for the root URL
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html'); // Serve the index.html file
});

// Route to fetch inventory
app.get('/getInventory', (req, res) => {
    db.all('SELECT * FROM inventory1', [], (err, rows) => {
        if (err) {
            console.error('Error fetching inventory:', err.message);
            return res.status(500).send('Error fetching inventory');
        }
        res.json(rows); // Return the inventory as JSON
    });
});

// Route to add a new item
app.post('/addItem', (req, res) => {
    const { id, name, quantity, price } = req.body;

    // Check if ID already exists
    db.get('SELECT * FROM inventory1 WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('Error checking item existence:', err.message);
            return res.status(500).send('Failed to check item existence');
        }
        if (row) {
            return res.status(400).send('Item with this ID already exists'); // Prevent duplicate ID
        }

        // Insert new item if ID is unique
        db.run('INSERT INTO inventory1 (id, name, quantity, price) VALUES (?, ?, ?, ?)', 
        [id, name, quantity, price], function(err) {
            if (err) {
                console.error('Error adding item:', err.message);
                return res.status(500).send('Failed to add item');
            }
            res.status(201).send({ id: this.lastID }); // Send back the ID of the newly created item
        });
    });
});

// Route to update an item
app.put('/updateItem/:id', (req, res) => {
    const itemId = req.params.id; // Get the ID from the URL
    const { name, quantity, price } = req.body; // Get details from the request body

    const sql = 'UPDATE inventory1 SET name = ?, quantity = ?, price = ? WHERE id = ?';
    db.run(sql, [name, quantity, price, itemId], function(err) {
        if (err) {
            console.error('Error updating item:', err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        res.json({ success: true }); // Send success response
    });
});

// Route to delete an item
app.delete('/deleteItem', (req, res) => {
    const { id } = req.body;
    db.run('DELETE FROM inventory1 WHERE id = ?', id, function(err) {
        if (err) {
            console.error('Error deleting item:', err.message);
            return res.status(500).send('Failed to delete item');
        }
        if (this.changes === 0) {
            return res.status(404).send('Item not found');
        }
        res.status(204).send(); // No content to send back
    });
});

// Route to generate PDF report
app.get('/generateReport', (req, res) => {
    db.all('SELECT * FROM inventory1', [], (err, rows) => {
        if (err) {
            console.error('Error fetching inventory for report:', err.message);
            return res.status(500).send('Error fetching inventory for report');
        }

        // Create a new PDF document
        const doc = new jsPDF();
        
        // AutoTable for the inventory data
        doc.autoTable({
            head: [['ID', 'Name', 'Quantity', 'Price']],
            body: rows.map(row => [row.id, row.name, row.quantity, row.price]),
        });

        // Set the response headers for downloading
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="inventory_report.pdf"',
        });

        // Send the PDF blob back to the client
        const pdfOutput = doc.output('blob'); // Create PDF as blob
        res.send(pdfOutput); // Send the blob directly as response
    });
});

// Handle 404 for undefined routes
app.use((req, res) => {
    res.status(404).send('404: Resource not found');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
