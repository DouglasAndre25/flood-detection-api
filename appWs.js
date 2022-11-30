const WebSocket = require('ws')
const { Router } = require('express')

let connections = []
let floodValues = []

const verifyClient = (info, callback) => {
    return callback(true)
}

const onConnection = (socket, req) => {
    const locationName = req.url
    const locationQuery = decodeURI(req.url.substr('/?locations=').toLowerCase())
    const query = locationQuery.slice(12).split(',')

    connections = [
        ...connections,
        {
            socket,
            query: req.url.includes('locations') ? query : ['all']
        }
    ]

    if(locationName === '/create') {
        socket.on('message', data => onMessage(Buffer.from(data).toString()))
    }

    sendFloodValue()
    setInterval(() => {
        calculateFloodValue()
        sendFloodValue()
    }, 100000)
    socket.on('error', error => onError(socket, error))
}

const onMessage = data => {
    console.log('[WEBSOCKET] New message')
    let [name, address] = data.split(';')
    name = name.slice(1)
    address = address.substring(0, address.length - 1)

    const existingFloodValue = floodValues.find(floodValue => floodValue.name === name)
    const index = floodValues.findIndex(floodValue => floodValue.name === name)

    if(index >= 0) {
        floodValues[index] = {
            name: existingFloodValue.name,
            addresses: [...existingFloodValue.addresses, {
                name: address,
                value: 0
            }]
        }
    } else {
        floodValues.push({
            name: name,
            addresses: [
                {
                    name: address,
                    value: 0
                }
            ]
        })
    }

    sendFloodValue()
}

const calculateFloodValue = () => {
    console.log('[WEBSOCKET] New message')
    const newFloodValue = floodValues.map(floodValue => {
        return {
            name: floodValue.name,
            addresses: floodValue.addresses.map(address => {
                const value = Math.round(Math.random() * 10)
                return {
                    name: address.name,
                    value
                }
            })
        }
    })

    floodValues = newFloodValue
}

const sendFloodValue = () => {
    console.log('[WEBSOCKET] Send Response')
    connections.forEach(connection => {
        if(connection.socket.readyState !== WebSocket.CLOSED) {
            const response = floodValues.filter(
                floodValue => connection.query.includes(floodValue.name.toLowerCase())
                || connection.query.includes('all')
            )

            connection.socket.send(JSON.stringify(response))
        }
    })

}

const onError = err => {
    console.error(`onError: ${err.message}`)
}

const checkConnections = () => {
    console.log('[WEBSOCKET] Checking current connections')
    const checkedConnections = connections

    connections.forEach((connection, index) => {
        const locationConnections = connection.socket.readyState === WebSocket.CLOSED

        if(locationConnections)
        checkedConnections.splice(index, 1)
    })
    connections = checkedConnections
}

const createRoutes = app => {
    const routes = new Router()

    routes.get('/locations', (req, res, next) => {
        const response = floodValues.map(floodValue => floodValue.name)
        return res.send({ data: response })
    })

    routes.delete('/locations/:id', (req, res, next) => {
        try {
            floodValues.splice(req.params.id, 1)
            const response = floodValues.map(floodValue => floodValue.name)
            return res.send({ data: response })
        } catch (err) {
            console.log(err)
        }
    })

    app.use(routes)
}

module.exports = (server, app) => {
    const wss = new WebSocket.Server({
        server,
        verifyClient
    })

    wss.on('connection', (socket, req) => onConnection(socket, req))
    console.log('App Web Socket Server is running!')
    setInterval(checkConnections, 100000)

    createRoutes(app)

    return wss
}
