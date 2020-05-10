require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");


// === BCrypt salt rounds ===
const saltRounds = 5;

// === Express setup ===
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// === EJS ===
app.set("view engine", "ejs");

// === Sessions setup ===
app.use(session(
    {
        secret: "This Is Secret.",
        resave: false,
        saveUninitialized: false
    }
));

// === Passport setup ===
app.use(passport.initialize());
app.use(passport.session());

// === Mongoose setup ===
mongoose.connect(process.env.MONGODB, {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);
mongoose.connection.on("connected", () => console.log(`Connected to: ${mongoose.connection.name}`));
mongoose.connection.on("error", (err) => console.error("Connection failed with - ", err));


const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);
const User = new mongoose.model("User", userSchema);

// === Passport Serialize/Deserialize ===
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// === HTTP Methods ===
app.get("/", (req, res) => {
    res.render("home");


});

app.get("/login", (req, res) => {
    res.render("login");

});

app.post("/login", passport.authenticate("local",
    {
        failureRedirect: "/login",
        successRedirect: "/secrets"
    })
);

app.get("/register", (req, res) => {
    res.render("register");

});

app.post("/register", (req, res) => {

    User.register({username: req.body.username}, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            })
        }
    })

});

app.get("/secrets", (req, res) => {
    if (req.isAuthenticated()) {
        console.log("AUTHENTICATED: " + req.isAuthenticated());
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
})

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
})

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
});
