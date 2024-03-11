const express = require('express')
const AWS = require('aws-sdk')
const multer = require('multer')
const path = require('path')
require("dotenv").config();

const app = express()
const PORT = process.env.PORT

// config 
app.use(express.json({extended : true}))
app.use(express.static('views'))
app.set('view engine', 'ejs')
app.set('views', 'views')

// aws
AWS.config.update({
    region : process.env.REGION,
    accessKeyId : process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
})
const S3 = new AWS.S3()
const Dynamodb = new AWS.DynamoDB.DocumentClient()

// Dynamodb
const table = 'student'
// 1. multer
const storage = multer.memoryStorage({
    destionation(req, file, cb){
        cb(null,'')
    }
})

const upload = multer({
    storage,
    limits : {fileSize : 2000000},
    fileFilter(req, file, cb){
        checkFile(file,cb)
    }
})

function checkFile(file, cb){
    const fileTypes = /'jpg|png|jpeg|gift'/
    console.log(file.originalname)
    if(!file.originalname){
        cb('Error: Original file name not provided')
    }

    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);

    if(!extname || !mimetype){
        cb('Error: Image pls')
    }

    return cb(null, true);
}

app.get('/', async(req,res) =>{
    const responsive = await Dynamodb.scan({
        TableName : table
    }).promise();
    const students =  Array.isArray(responsive.Items) ? responsive.Items : [responsive.Items]
    console.log(responsive)
    res.render('index.ejs', {students})
}) 

app.post('/save',upload.single("avatar"), (req, res)=>{
    // upload s3
})

app.listen(process.env.PORT, () =>{
    console.log('Web is running at: http://localhost:' + PORT)
})