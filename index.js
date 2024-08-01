const express = require('express');
require('dotenv').config()
const clc = require('cli-color');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const mongodbSession = require('connect-mongodb-session')(session);
const jwt = require('jsonwebtoken');

//file-imports
const { userDataValidation, isEmailRgex } = require('./utils/authUtils');
const userModel = require('./models/userModel');
const isAuth = require('./middleware/authMiddleware');
const ratelimiting = require('./middleware/rateLimiting');
const { todoDataValidation, genrateToken, sendVerificationMail } = require('./utils/todoUtils');
const userTodoModel = require('./models/userTodoModel');

//constants
const app = express();
const PORT = process.env.PORT;
const store = new mongodbSession({
    uri: process.env.MONGO_URI,
    collection: "sessions"
});

//db connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log(clc.yellow.bold('mongodb connected successfully'));
    })
    .catch((err) => { clc.red(console.log(err)) });

//middlewares
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));//body parser url encoded
app.use(express.json()); //body parser jsom
app.use(express.static('public'));

app.use(
    session({
        secret: process.env.SECRET_KEY,
        store: store,
        resave: false,
        saveUninitialized: false,
    }));

app.get('/', (req, res) => {
    return res.render('homePage');
});


//registration page 
app.get('/register', (req, res) => {
    return res.render('registerPage');
});

app.post('/register', async (req, res) => {
    // console.log(req.body);
    // console.log('hii');
    const { name, email, username, password } = req.body;

    //data validation 
    try {
        await userDataValidation({ name, email, username, password });
    } catch (error) {
        return res.status(400).json(error);
    }


    try {

        //email and username should be unique
        const userEmailExist = await userModel.findOne({ email: email });
        // console.log(userEmailExist);
        if (userEmailExist) {
            return res.status(400).json('Email already exist');
        }

        const userUserNameExist = await userModel.findOne({ username: username });
        if (userUserNameExist) {
            return res.status(400).json('Username already exist');
        }

        //encrypt the password
        const hashesPassword = await bcrypt.hash(
            password,
            parseInt(process.env.SALT));

        //store with in db
        const userObj = new userModel({
            name,
            email,
            username,
            password: hashesPassword,
        });

        const userDb = await userObj.save();

        //genrate token
        const token = genrateToken(email);
        console.log(token);
        //console.log('email', jwt.verify(token, process.env.SECRET_KEY));

        //send 
        sendVerificationMail(email, token);

        return res.redirect('/login');
    } catch (error) {
        return res.status(500).json({
            message: 'Internal server error',
            error: error,
        });
    }

    // return res.send('User register successsfully');
});

app.get('/verifytoken/:token', async (req, res) => {
    // console.log(req.params.token);
    const token = req.params.token;
    const email = jwt.verify(token, process.env.SECRET_KEY);
    // console.log(email);

    try {
        const userdb = await userModel.findOneAndUpdate({ email: email }, { isEmailVerified: true });
        return res.send("Email has been verified successfully");
    } catch (error) {
        return res.status(500).json(error);
    }
});


//login page
app.get('/login', (req, res) => {
    return res.render("loginPage");
});

app.post('/login', async (req, res) => {
    //console.log(req.body);
    const { loginId, password } = req.body;
    if (!loginId || !password) {
        return res.status(400).json('Missing login credentials');
    }

    if (typeof loginId !== 'string')
        return res.status(400).json('loginId is not a string');

    if (typeof password !== 'string')
        return res.status(400).json('password is not a string');

    //find the user from db
    try {
        let userDb = {};
        if (isEmailRgex({ key: loginId })) {
            userDb = await userModel.findOne({ email: loginId });
            console.log('find user with email');
        } else {
            userDb = await userModel.findOne({ username: loginId })
        }
        if (!userDb)
            return res.status(400).json('User not found,  Please register  first');

        //check for verified email
        if (!userDb.isEmailVerified) {
            return res.status(400).json('verify your email id before login')
        }

        //compare the passord
        //console.log(password, userDb.password);
        const isMatched = await bcrypt.compare(password, userDb.password);
        // console.log(isMatched)
        if (!isMatched) {
            return res.status(400).json('Password is incorrect');
        }

        console.log(req.session);
        req.session.isAuth = true;
        req.session.user = {
            userId: userDb._id,
            username: userDb.username,
            email: userDb.email,
        }

        // console.log(userDb)
        return res.redirect('/dashboard')
    } catch (error) {
        return res.status(500).json(console.error());
    }

    // session based auth

});

app.get('/dashboard', isAuth, (req, res) => {
    return res.render('dashboardPage');
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json('Logout unsuccessfull');
        return res.redirect('/login');
    });
});

app.post('/create-item', isAuth, async (req, res) => {
    const todo = req.body.todo;
    const username = req.session.user.username;

    try {
        await todoDataValidation({ todo });
    } catch (error) {
        return res.status(400).json(error);
    }

    const userObj = new userTodoModel({
        todo: todo,
        username: username
    });

    try {
        const todoDb = await userObj.save();
        return res.status(201).json({
            message: 'Todo created successfully',
            data: todoDb,
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Internal server error',
            error: error,
        });
    }
});

// /read-item?skip=5
app.get('/read-item', isAuth, async (req, res) => {
    const username = req.session.user.username;
    const SKIP = Number(req.query.skip) || 0;
    const LIMIT = 5;

    try {
        //const todoDb = await userTodoModel.find({ username: username });
        // console.log(todoDb);

        //mogodb aggregate method
        //pagination(skip,limit), match

        const todoDb = await userTodoModel.aggregate([
            {
                $match: { username: username },
            },
            {
                $skip: SKIP,
            },
            {
                $limit: LIMIT,
            }
        ]);

        //console.log(todoDb);
        if (todoDb.length === 0) {
            if (SKIP > 0) {
                return res.send({
                    stauts: 204,
                    message: "No more todo found",
                });
            } else {
                return res.send({
                    status: 204,
                    message: "No todo found, please create",
                });
            }
        }


        return res.send({
            status: 200,
            message: 'Read Success',
            data: todoDb,
        });
    } catch (error) {
        return res.send({
            status: 500,
            message: 'Internal server error',
            error: error,
        })
    }
});

app.post('/edit-item', isAuth, async (req, res) => {
    const newData = req.body.newData;
    const todoId = req.body.todoId;
    const username = req.session.user.username;

    // console.log(newData, todoId, username);

    if (!todoId) return res.status(400).json('Todo is missing');

    try {
        await todoDataValidation({ todo: newData });
    } catch (error) {
        return res.send({
            status: 400,
            message: error,
        })
    }

    try {
        const todoDb = await userTodoModel.findOne({ _id: todoId });
        // console.log(todoDb);

        if (!todoDb) {
            return res.send({
                status: 400,
                message: `todo not found with this is : ${todoId}`,
            });
        }

        //check ownership
        if (username !== todoDb.username) {
            return res.send({
                stauts: 403,
                message: 'not allowed to edit the todo',
            });
        }

        //update the todo in db
        const todoDbPrev = await userTodoModel.findOneAndUpdate({ _id: todoId }, { todo: newData });

        return res.send({
            status: 200,
            message: 'Todo updated successfully',
            data: todoDbPrev,
        });
    } catch (error) {
        return res.send({
            status: 500,
            message: 'Internal server error',
            error: error
        });
    }

});

app.post('/delete-item', isAuth, async (req, res) => {
    const todoId = req.body.todoId;
    const username = req.session.user.username;

    if (!todoId) return res.status(400).json('Todo is missing');

    try {
        const todoDb = await userTodoModel.findOne({ _id: todoId });
        // console.log(todoId);

        if (!todoDb) {
            return res.send({
                status: 400,
                message: `todo not found with this is : ${todoId}`,
            });
        }

        //check ownership
        if (username !== todoDb.username) {
            return res.send({
                stauts: 403,
                message: 'not allowed to delete the todo',
            });
        }

        //update the todo in db
        const todoDbPrev = await userTodoModel.findOneAndDelete({ _id: todoId });

        return res.send({
            status: 200,
            message: 'Todo deleted successfully',
            data: todoDbPrev,
        });
    } catch (error) {
        return res.send({
            status: 500,
            message: 'Internal server error',
            error: error,
        });
    }
});

app.listen(PORT, () => {
    console.log(clc.yellow('Server is running'));
    console.log(clc.white.underline(`http://localhost: ${PORT}/`));
});