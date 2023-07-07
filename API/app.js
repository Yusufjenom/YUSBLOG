require("dotenv/config"); // loads variables from .env file
const express = require("express");
const cors =  require('cors')
const mongoose = require('mongoose')
require('./database/db')
const userModel = require('./model/userModel')
const postModel = require('./model/post')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const multer = require('multer')
const uploadMiddleware = multer({dest: 'uploads/'})
const fs = require('fs')

const {PORT = 8888} = process.env;

const app = express();

//middleware
app.use(cors({
  credentials: true,
  origin: "http://localhost:3000"
}))
app.use(express.json());
app.use(cookieParser())
app.use('/uploads', express.static(__dirname + '/uploads'))


const SECRET = "yusthejavascrptwizard"
const time = 60 * 60 * 24 * 3

app.post('/register', async (req,res) => {
  const {username, password} = req.body
  const newUser = new userModel({ username,
    password})
    try{
      await newUser.save()
      res.json(newUser)
    }
    catch(error){
      console.log(error.message)
      res.status(400).json(error)
    }
  
  
})




app.post('/login', async (req,res) => {
  const {username, password} = req.body
  const userDB = await userModel.findOne({username})
  const passwordResult =  bcrypt.compareSync(password, userDB.password)
  if(passwordResult){
     jwt.sign({username, id: userDB._id}, SECRET, {}, (err, token)=>{
      if(err) throw err
      res.cookie('token', token).json({
        id:userDB._id,
        username
      })
      console.log(token)
     })
    }else{
    res.status(400).json('incorrect password')
  }

})


app.get("/profile", (req,res) => {
  const {token} = req.cookies
  jwt.verify(token, SECRET, {}, (err, info) => {
    if(err) throw err
    res.json(info)
  })
})


app.post('/logout', (req,res) => {
  res.cookie('token', '').json('ok')
})


app.post('/post',uploadMiddleware.single('file') , async(req,res) => {
  const {originalname, path} = req.file
  const parts = originalname.split('.')
  const ext = parts[parts.length - 1]
  const newPath = path+'.'+ext
   fs.renameSync(path, newPath)
   
   const {token} = req.cookies
   jwt.verify(token, SECRET, {}, async (err, info) => {
    if(err) throw err
    const {title, summary, content} = req.body
    const postDoc = await postModel.create({
     title,
     summary,
     content,
     cover: newPath,
     author:info.id
    })
    res.json(postDoc)
  })
  
   

  
})


app.get('/post', async (req, res) => {
 await postModel.find().populate('author', ['username']).sort({createdAt: -1}).limit(20)
  .then(posts => {
    res.json(posts)
    //console.log(posts)
  })
  
})


app.get('/singlepost/:id', async (req, res) =>{
   const {id} = req.params
   await postModel.findById(id).populate('author', ['username'])
   .then(result => {
    console.log(result)
    res.json(result)
   })
  //  const singleDoc = await postModel.findById(id)   //.populate('author', ['username'])
  //  console.log(singleDoc)
  //  res.json(singleDoc)
})

app.put('/singlepost',uploadMiddleware.single('file'), (req,res) => {
  let newPath = null;
   if(req.file){
    const {originalname, path} = req.file
    const parts = originalname.split('.')
    const ext = parts[parts.length - 1]
     newPath = path+'.'+ext
     fs.renameSync(path, newPath)
   }

   const {token} = req.cookies
   jwt.verify(token, SECRET, {}, async (err, info) => {
    if(err) throw err
    const {id, title, summary, content} = req.body
    const postDoc = await postModel.findById(id)
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id)
    // res.json(isAuthor, postDoc, info)
    if(!isAuthor){ 
      res.status(400).json('you are not the author so yu cannot make changes')
      // throw 'invalid author'
    }

    await postDoc.updateOne({
      title,
       summary, 
       content,
      cover: newPath ? newPath : postDoc.cover
      })
   res.json(postDoc)
  })
})

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});