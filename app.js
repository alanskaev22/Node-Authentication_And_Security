require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate")
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;


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
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

// === Passport Serialize/Deserialize ===
passport.use(User.createStrategy());
passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({googleId: profile.id}, function (err, user) {
            return cb(err, user);
        });
    }
));

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, (err, user) => {
        done(err, user);
    })
});

// === HTTP Methods ===
app.get("/", (req, res) => {
    res.render("home");
});

app.get("/auth/google", passport.authenticate("google", {scope: ["profile"]}));

app.get("/auth/google/secrets", passport.authenticate("google",
    {
        failureRedirect: "/login",
        successRedirect: "/secrets"
    }));

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
    User.find({"secret": {$ne: null}}, (err, users)=>{
        if(err){
            console.log(err)
        }else{
            if(users){
                res.render("secrets", {usersWithSecrets:users});
            }
        }
    });
});


app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) {
        console.log("AUTHENTICATED: " + req.isAuthenticated());
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;
    User.findById(req.user.id, (err, user) => {
        if (err) {
            console.log(err);
            res.send(err);
        } else {
            if (user) {
                user.secret = submittedSecret;
                user.save(() => {
                    res.redirect("/secrets");
                });
            }
        }
    })

})

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
})

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
});
