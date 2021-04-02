const express = require("express");
const bodyParser = require("body-parser");
const { Sequelize, DataTypes } = require("sequelize");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const app = express();
const { Mutex, Semaphore, withTimeout } = require("async-mutex");
const mutex = new Mutex();
const semaphore = new Semaphore(3);
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
    dialect: "mysql",
    pool: {
      max: 50,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Model
const shortlinkModel = sequelize.define("shortlink", {
  short_url: {
    primaryKey: true,
    type: DataTypes.STRING,
    allowNull: false,
  },
  full_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  visits: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
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
  console.log("2");
  let refUrl = req.params.refUrl;
  console.log(refUrl);
  try{
    await shortlinkModel.update({visits: sequelize.literal('visits + 1')}, {where: {short_url: refUrl}});
    const result = await shortlinkModel.findByPk(refUrl);
    res.set("location", result.full_url);
    return res.redirect(result.full_url)
  }catch(err){
    console.log(err)
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

  await shortlinkModel.findOne({
    where :  { full_url: fullUrl }
  }).then(async(matched) =>{
    if(!matched){
    const createUrl = await shortlinkModel.create({
      full_url: fullUrl,
      short_url: preRandom,
     })
     return createUrl.save();
    }
  }).then((createdUrl) =>{
    return res.json({
      link: `http://${process.env.APP_URL}/l/${createdUrl.short_url}`,
    });
  
  })
  // const [url, created] = await shortlinkModel.findOrCreate({
  //   where: { full_url: fullUrl },
  //   defaults: {
  //     full_url: fullUrl,
  //     short_url: preRandom,
  //   },
  // });
  // console.log("test check value");
  // console.log(url.full_url);
  // console.log(url.short_url);

  // return res.json({
  //   link: `http://${process.env.APP_URL}/l/${111}`,
  // });

});

app.get("/l/:refUrl/stats", async (req, res) => {
  let refUrl = req.params.refUrl;

  const result = await shortlinkModel.findByPk(refUrl);
  console.log("test visit");
  console.log(result);

  return res.json({
    visit: result.visits,
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
    force: false,
  });
  app.listen(process.env.APP_PORT, () => {
    console.log(`application started at port : ${process.env.APP_PORT}`);
  });
} catch (error) {
  console.error("Unable to connect to the database:", error);
}
