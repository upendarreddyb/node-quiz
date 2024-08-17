
const mysql = require("mysql");
// Create a connection to the database
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    // password: 'upendar@123',
    database: 'quiz'
});

// open the MySQL connection
connection.connect(error => {
    if (error) throw error;
    console.log("Successfully connected to the database.");
});

/*   sql="select * from Login";
  query=connection.query(sql);
  console.log(sql); */

module.exports = connection;