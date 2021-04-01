const express = require("express");
const bodyParser = require("body-parser");
const { Sequelize, DataTypes } = require('sequelize');
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const app = express();

dotenv.config();
// Config app name
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const sequelize = new Sequelize(
  process.env.DB_DATABASE_NAME,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql'
  });


// Model
const shortlinkModel = sequelize.define('shortlink', {
  short_url: {
    primaryKey : true,
    type: DataTypes.STRING,
    allowNull: false
  },
  full_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  visits: {
    type: DataTypes.INTEGER,
    allowNull : true,
    defaultValue : 0
  }
});
// const db = mysql.createPool({
//   host: process.env.DB_HOST || "localhost",
//   user: process.env.DB_USERNAME || "",
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_DATABASE_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });

app.get("/test", (req, res) => {
  return res.send("OK");
});

app.get("/l/:refUrl", async (req, res) => {
  let refUrl = req.params.refUrl;
  await db.execute(
    "update url set visits = visits+1 where short_url = ?", [refUrl]
  );
  const [rows] = await db.execute(
    "SELECT full_url FROM url WHERE short_url =  ?", [refUrl]
  );

  let fullUrl;
  try {
    fullUrl = rows[0].full_url;
  } catch (error) {
    fullUrl = "https://www.google.com";
  }
  res.set("location", fullUrl);
  return res.redirect(fullUrl);
});

app.post("/link", async (req, res, next) => {
  let fullUrl = req.body.url;
  function randomId(length) {
    var result = "";
    var characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
  const [rows] = await db.execute(
    "SELECT short_url FROM url WHERE full_url = ?", [fullUrl]
  );
  if (rows.length == 0) {
    let preRandom = randomId(4);
    try {
      await db.execute(
        "INSERT INTO url (full_url, short_url) VALUES (?, ?)", [fullUrl, preRandom]
      );
      return res.json({
        link: `http://${process.env.APP_URL}/l/${preRandom}`,
      });
    } catch (error) {
      preRandom = randomId(5);
      await db.execute(
        "INSERT INTO url (full_url, short_url) VALUES (?, ?)", [fullUrl, preRandom]
      );
      return res.json({
        link: `http://${process.env.APP_URL}/l/${preRandom}`,
      });
    }
  } else {
    let short_url = rows[0].short_url;
    return res.json({
      link: `http://${process.env.APP_URL}/l/${short_url}`,
    });
  }
});

app.get("/l/:refUrl/stats", async (req, res) => {
  let refUrl = req.params.refUrl;

  const [rows] = await db.execute(
    "SELECT visits FROM url WHERE short_url = ?", [refUrl]
  );
  return res.json({
    visit: rows[0].visits,
  });
});

app.use("/", (req, res) => {
  res.json({
    stutus: 200,
    message: "Server runing..",
  });
});
try {
  sequelize.authenticate();

  shortlinkModel.sync({
    force: true
  })
  app.listen(process.env.APP_PORT, () => {
    console.log(`application started at port : ${process.env.APP_PORT}`);
  });
} catch (error) {
  console.error('Unable to connect to the database:', error);
}

