require('dotenv/config')
const app = require('./app')
const appWs = require('./appWs')
const port = process.env.PORT || 8080

const server = app.listen(port, () => {
    console.log(`Rodando na porta ${port}...`)
})

appWs(server)