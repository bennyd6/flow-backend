const express = require('express')
const cors=require("cors")
const connectToMongo=require('./db')

const app = express()
const port = 3000 

connectToMongo();

app.use(cors()) 
app.use(express.json()) 

app.use('/api/auth', require('./routes/auth'))
app.use('/api/projects', require('./routes/proj'))
app.use('/api/tasks', require('./routes/task'))


app.listen(port, () => {
  console.log(`Project management backend listening at http://localhost:${port}`)
})
