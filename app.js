$(document).ready(function () {
    // Fetch and display existing inventory items on page load
    fetchInventory();

    // Handle the form submission for adding a new item
    $('#addItemForm').on('submit', function (event) {
        event.preventDefault(); // Prevent default form submission

        const itemId = $('#itemId').val().trim();
        const itemName = $('#itemName').val().trim();
        const itemQty = parseInt($('#itemQuantity').val().trim(), 10);
        const itemPrice = parseFloat($('#itemPrice').val().trim());

        // Log data for debugging
        console.log('Adding item:', {
            id: itemId,
            name: itemName,
            quantity: itemQty,
            price: itemPrice
        });

        // Validate input
        if (!itemId || !itemName || isNaN(itemQty) || isNaN(itemPrice)) {
            toastr.error('All fields are required and must be valid!');
            return; // Stop the submission
        }

        // Use fetch to add the item to the inventory
        fetch('http://localhost:3001/addItem', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: itemId,
                name: itemName,
                quantity: itemQty,
                price: itemPrice
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to add item');
            }
            return response.json();
        })
        .then(data => {
            console.log('Item added:', data);
            fetchInventory(); // Refresh the inventory list
            $('#addItemModal').modal('hide'); // Close the modal
            toastr.success('Item added successfully!');
        })
        .catch(error => {
            console.error('Error:', error);
            toastr.error('Failed to add item');
        });
    });

    // Function to fetch and display inventory items
    function fetchInventory() {
        $.ajax({
            url: '/getInventory',
            method: 'GET',
            success: function (data) {
                const inventoryList = $('#inventoryList');
                inventoryList.empty(); // Clear existing inventory list
                const itemNames = [];
                const itemQuantities = [];
                const warnings = [];

                data.forEach(item => {
                    inventoryList.append(`
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>${item.price}</td>
                            <td>
                                <button class="btn btn-warning btn-sm" onclick="showUpdateModal('${item.id}', '${item.name}', ${item.quantity}, ${item.price})">Update</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteItem('${item.id}')">Delete</button>
                            </td>
                        </tr>
                    `);

                    itemNames.push(item.name);
                    itemQuantities.push(item.quantity);

                    // Check for stock-out warnings
                    if (item.quantity < 5) {
                        warnings.push(`${item.name} is low on stock!`);
                    }
                });

                updateChart(itemNames, itemQuantities); // Update chart with new data
                displayStockOutWarnings(warnings); // Display stock-out warnings
            },
            error: function (error) {
                console.error('Error fetching inventory:', error);
            }
        });
    }

    // Function to show the update modal and populate it with item data
    window.showUpdateModal = function(id, name, quantity, price) {
        $('#updateItemId').val(id);
        $('#updateItemName').val(name);
        $('#updateItemQty').val(quantity);
        $('#updateItemPrice').val(price);
        $('#updateItemModal').modal('show');
    };

    // Handle the form submission for updating an item
    $('#updateItemForm').on('submit', function (event) {
        event.preventDefault(); // Prevent default form submission

        const itemId = $('#updateItemId').val();
        const itemName = $('#updateItemName').val();
        const itemQty = $('#updateItemQty').val();
        const itemPrice = $('#updateItemPrice').val();

        // Log data for debugging
        console.log('Updating item:', {
            id: itemId,
            name: itemName,
            quantity: itemQty,
            price: itemPrice
        });

        // Use fetch to update the item in the inventory
        fetch(`http://localhost:3001/updateItem/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: itemName,
                quantity: itemQty,
                price: itemPrice
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update item');
            }
            return response.json();
        })
        .then(data => {
            console.log('Item updated:', data);
            fetchInventory(); // Refresh the inventory list
            $('#updateItemModal').modal('hide'); // Close the modal
            toastr.success('Item updated successfully!');
        })
        .catch(error => {
            console.error('Error:', error);
            toastr.error('Failed to update item');
        });
    });

    // Function to delete an item
    window.deleteItem = function(itemId) {
        if (confirm('Are you sure you want to delete this item?')) {
            $.ajax({
                url: '/deleteItem',
                type: 'DELETE',
                contentType: 'application/json',
                data: JSON.stringify({ id: itemId }),
                success: function() {
                    fetchInventory(); // Refresh inventory after deletion
                    toastr.success('Item deleted successfully!');
                },
                error: function(error) {
                    console.error('Error deleting item:', error);
                    toastr.error('Failed to delete item');
                }
            });
        }
    };

    // Function to filter the inventory based on search input
    $('#searchInput').on('keyup', function () {
        const filter = $(this).val().toLowerCase();
        $('#inventoryList tr').filter(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(filter) > -1);
        });
    });

    // Handle report generation
    $('#printReportBtn').on('click', function() {
        generateReport(); // Call the function to generate the report
    });

    // Function to generate a PDF report
    function generateReport() {
        $.ajax({
            url: '/generateReport', // Endpoint to fetch inventory data for the PDF
            method: 'GET',
            success: function(data) {
                const blob = new Blob([data], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                
                // Create a temporary link element to download the PDF
                const a = document.createElement('a');
                a.href = url;
                a.download = 'inventory_report.pdf'; // Filename for the downloaded PDF
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            },
            error: function() {
                toastr.error('Error generating report. Please try again.');
            }
        });
    }
});

// Declare chart variable
let myChart;

// Update Chart Function
function updateChart(labels, data) {
    const ctx = document.getElementById('inventoryChart').getContext('2d');

    if (myChart) {
        myChart.destroy(); // Destroy existing chart instance
    }

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Item Quantities',
                data: data,
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1,
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                }
            },
        }
    });
}

// Function to display stock-out warnings
function displayStockOutWarnings(warnings) {
    const warningContainer = $('#stockOutWarnings');
    warningContainer.empty(); // Clear existing warnings
    if (warnings.length > 0) {
        warnings.forEach(warning => {
            warningContainer.append(`<div class="alert alert-warning">${warning}</div>`);
        });
    } else {
        warningContainer.append('<div class="alert alert-success">All items are in stock.</div>');
    }
}
