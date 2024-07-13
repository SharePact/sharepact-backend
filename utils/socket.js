const jwt = require("jsonwebtoken");
const  { Server: WSServer } = require("ws");

// export class SocketIOEventHandler {
//     io: Server;
//     constructor(io: Server){
//         this.io = io;

//         io.on('connection', this.handleConnection)
//         io.use(async (socket: Socket, next) => {
//             const token = socket.handshake.auth.token;
//             // ...
//             try{
//                 const user = await jwt.decode({ token })
//                 socket.handshake.auth.user = user
//                 next()
//             }
//             catch(e: any){
//                 next(e)
//             }
//         });
//     }

//     async handleConnection(socket: Socket){
//         // join users to all rides they are in
//         const userRides = await RideService.getAllRidesForUser(Number(socket.handshake.auth.user.id))
//         userRides.map(ride => { 
//             socket.join(ride.id.toString()); 
//         })

//         socket.on('messageSent', ({ rideId, message }) => {
//             socket.to(rideId).emit('messageBroadcast', message)
//         })
//     }

//     broadcastMessage(rideId: string, message: any){
//         this.io.to(rideId).emit('messageBroadcast', message)
//     }
// }



export class PlainWebSocketHandler{
    wss;
    rooms;
    
    constructor(server){
        this.rooms = {}
        this.wss = new WSServer({ server })

        this.wss.on('connection', async (ws, req) => {
            try{
                const token = req.headers['authorization']?.split(' ')[1]
                if(!token) return ws.close(4001, "Invalid token provided")

                const user = await jwt.decode({ token })
                if(!user) return ws.close(4001, "Invalid token provided")
                ws.user = user
            }
            catch(e){
                return ws.close(4001, "Invalid token provided")
            }

            if(!ws.user) return ws.close(4001, "Invalid token provided")

            // create room for user
            this.rooms[ws.user.uid] = ws;

            ws.on('message', (message) => {
                console.log(message.toString())
            })
        })
    }

    broadcastMessage(userIDs, message){
        userIDs.forEach(id => {
            if(this.rooms[id]){
                if(this.rooms[id].readyState === this.rooms[id].CLOSED) {}
                this.rooms[id].send(JSON.stringify(message))
            }
        })
    }
}