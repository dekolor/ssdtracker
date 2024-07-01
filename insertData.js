const db = require("./db");

function insertRow(price, link) {
  db.run(
    `INSERT INTO prices (price, link) VALUES (?, ?)`,
    [price, link],
    function (error) {
      if (error) {
        console.error(error.message);
      }
      console.log(`Inserted a row with the ID: ${this.lastID}`);
    }
  );
}

insertRow(1234, "http://dekolor.ro");
