const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise')

const app = express();

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))


const db = mysql.createPool({
    host: '',
    user: '',
    password: '',
    database: 'golang-shorten',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0
});



app.get("/l/:refUrl", async (req, res) => {
    let refUrl = req.params.refUrl;
    const [rows, fields] = await db.execute(`SELECT full_url FROM url WHERE short_url = '${refUrl}'`);

    if(rows[0].full_url != 0){
        await db.execute(`update url set visits = visits+1 where short_url = '${refUrl}'`)
    }
    res.set('location', rows[0].full_url)
    return res.send("OK")
})

app.post("/link", async (req, res, next) => {
    let exist = true;
    let fullUrl = req.body.url;

    if (fullUrl.length == 0) {
        return res.send("URL is not empty.")
    }

    function randomId(length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    let preRandom;

    while (exist == true) {
        preRandom = randomId(4);
        try {
             await db.execute(`SELECT short_url FROM url WHERE short_url = '${preRandom}'`).then(async ([rows]) => {
                if (rows.length == 0) {
                    const insert = await db.execute(`INSERT INTO url (full_url, short_url) VALUES ('${fullUrl}','${preRandom}')`).then((s) => {
                        return true;
                    })
                    if (insert) {
                        exist = false
                    }
                }
            })

        } catch (error) {
            next()
        }
    }



    return res.json({
        'link': `http://localhost:8010/l/${preRandom}`
    })

})


app.get("/l/:refUrl/stats", (req, res) => {
    let refUrl = req.params.refUrl;
    db.query(`UPDATE url SET visits = visits+1 WHERE short_url = '${refUrl}'`)
    return res.json(rows)
})

app.use("/", (req, res) => {
    res.send("OK");
})

app.listen(8010, () => {
    console.log('application started at port : 8010');
})
