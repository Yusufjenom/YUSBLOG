const mongoose = require('mongoose')


async function databaseConnection(){
    //connect to database
    await mongoose.connect('mongodb://0.0.0.0:27017/yus-blog')
    .then(res => console.log('connected to database successfully'))
    .catch(error => console.log(error.message))
}

databaseConnection()