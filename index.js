const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const app = express();

dotenv.config();

// Config app name
app.set('view engine', 'pug')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USERNAME || "",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.get('/', (req,res) => {
  return res.render('index')
})

app.get("/test", (req, res) => {
  return res.send("OK");
});

app.get("/l/:refUrl", async (req, res) => {
  let refUrl = req.params.refUrl;
  await db.execute("update urls set visits = visits+1 where short_url = ?", [
    refUrl,
  ]);
  const [rows] = await db.execute(
    "SELECT full_url FROM urls WHERE short_url =  ?",
    [refUrl]
  );
  let fullUrl;
  try {
    fullUrl = rows[0].full_url;
    if (!/^https?:\/\//i.test(fullUrl)) {
      fullUrl = 'http://' + fullUrl;
    }
    res.set("location", fullUrl);
    return res.redirect(fullUrl);
  } catch (error) {
    fullUrl = "https://www.google.com";
    return res.status(404).send("Not Found");
  }
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
  let preRandom = randomId(4);
  try {
    await db.execute("INSERT INTO urls (full_url, short_url) VALUES (?, ?)", [
      fullUrl,
      preRandom,
    ]);
    return res.json({
      link: `${process.env.APP_URL}/l/${preRandom}`,
    });
  } catch (error) {
    //กรณี preRandom ซ้ำกันเลยสร้างใหม่
    console.log("check 1");
    preRandom = randomId(6);
    try {
      await db.execute("INSERT INTO urls (full_url, short_url) VALUES (?, ?)", [
        fullUrl,
        preRandom,
      ]);
      return res.json({
        link: `${process.env.APP_URL}/l/${preRandom}`,
      });
    } catch (err) {
      console.log("check 2");
      console.log(err);
      //กรณีเปลี่ยน preRandom แล้วแต่ full_url มีอยู่แล้ว
      const [rows] = await db.execute(
        "SELECT short_url FROM urls WHERE full_url = ?",
        [fullUrl]
      );
      if (rows.length != 0) {
        let short_url = rows[0].short_url;
        return res.json({
          link: `${process.env.APP_URL}/l/${short_url}`,
        });
      }
      return res.status(500).json({
        status: 500,
        message: "preRandom duplicate in database.",
      });
    }
  }
});

app.get("/l/:refUrl/stats", async (req, res) => {
  let refUrl = req.params.refUrl;

  const [rows] = await db.execute(
    "SELECT visits FROM urls WHERE short_url = ?",
    [refUrl]
  );
  return res.json({
    visit: rows[0].visits,
  });
});


app.listen(process.env.APP_PORT, () => {
  console.log(`application started at port : ${process.env.APP_PORT}`);
});
