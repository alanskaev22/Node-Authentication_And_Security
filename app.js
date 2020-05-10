require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 5;

const app = express();

// === Express setup ===
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");

// === Mongoose setup ===
mongoose.connect(process.env.MONGODB, {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.connection.on("connected", () => console.log(`Connected to: ${mongoose.connection.name}`));
mongoose.connection.on("error", (err) => console.error("Connection failed with - ", err));

const Schema = mongoose.Schema;
const userSchema = new Schema({
    email: String,
    password: String
});


const User = mongoose.model("User", userSchema);

// === HTTP Methods ===
app.get("/", (req, res) => {
    res.render("home");

});

app.get("/login", (req, res) => {
    res.render("login");

});

app.post("/login", (req, res) => {
    const userName = req.body.username;
    const password = req.body.password;

    User.findOne(
        {
            email: userName,
        },
        (err, result) => {
            if (!err) {
                if (result) {
                    bcrypt.compare(password, result.password, (err, bcryptPass) => {
                        if (bcryptPass) {
                            res.render("secrets");

                        } else {
                            console.log(err)
                        }
                    })
                }
            } else
                (res.send(err));
        }
    );
})
;

app.get("/register", (req, res) => {

    res.render("register");

});

app.post("/register", (req, res) => {
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
        const newUser = new User({
            email: req.body.username,
            password: hash
        });
        newUser.save((err) => {
            if (!err) {
                res.render("secrets");
            } else (res.send(err));
        })

    })

});

app.get("/secrets", (req, res) => {
    res.render("home");

});

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
});