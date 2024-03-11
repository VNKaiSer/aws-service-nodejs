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
const table = 'students'
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
    console.log(students)
    res.render('index.ejs', {students})
}) 

app.post('/save',upload.single("avatar"), (req, res)=>{
    console.log(req.body)
    // upload s3
    const data = { 
        id : req.body.id,
        name : req.body.name,
        gender : req.body.gender,
        gpa : req.body.gpa,
        // subject_enjoy : req.body.subject_enjoy,
        majors : req.body.majors
    }
    console.log(data)
   try {
    const file = req.file;
    const fileName = `${Date.now().toString()}-${file.originalname}`
    const s3Params = {
        Bucket : process.env.S3_BUCKET_NAME,
        Body : file.buffer,
        ContentType: file.mimetype,
        Key : fileName

    }
    S3.upload(s3Params, async(err, data)=>{
        if(err){
            console.log('Error: ', err)
            return res.status(500).send('500 Internal Server Error')
        } else{
            const DynamoParams = {
                TableName : table,
                Item : {
                    id : req.body.id,
                    name : req.body.name,
                    gender : req.body.gender,
                    gpa : req.body.gpa,
                    subject_enjoy : req.body.subject_enjoy,
                    image : data.Location,
                    majors : req.body.majors
                }
            }
           await Dynamodb.put(DynamoParams).promise();
        }
        res.redirect('/')
    })
   } catch (error) {
        console.log(err)
   }
})

app.listen(process.env.PORT, () =>{
    console.log('Web is running at: http://localhost:' + PORT)
})