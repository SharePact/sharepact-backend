import { Server, Socket } from "socket.io"
import { IDecoded, jwt } from "../helpers/jwt";
import { RideService } from "../services/ride.service";
import { WebSocket, Server as WSServer } from "ws";
import { Server as HttpServer, IncomingMessage } from "http";

export class SocketIOEventHandler {
    io: Server;
    constructor(io: Server){
        this.io = io;

        io.on('connection', this.handleConnection)
        io.use(async (socket: Socket, next) => {
            const token = socket.handshake.auth.token;
            // ...
            try{
                const user = await jwt.decode({ token })
                socket.handshake.auth.user = user
                next()
            }
            catch(e: any){
                next(e)
            }
        });
    }

    async handleConnection(socket: Socket){
        // join users to all rides they are in
        const userRides = await RideService.getAllRidesForUser(Number(socket.handshake.auth.user.id))
        userRides.map(ride => { 
            socket.join(ride.id.toString()); 
        })

        socket.on('messageSent', ({ rideId, message }) => {
            socket.to(rideId).emit('messageBroadcast', message)
        })
    }

    broadcastMessage(rideId: string, message: any){
        this.io.to(rideId).emit('messageBroadcast', message)
    }
}

export interface CustomWebSocket extends WebSocket {
    user: IDecoded
}

interface WSRoomStore {
    [key: string]: Array<CustomWebSocket>
}

export class PlainWebSocketHandler{
    wss: WSServer;
    rooms: WSRoomStore;
    
    constructor(server: HttpServer){
        this.rooms = {}
        this.wss = new WSServer({ server })

        this.wss.on('connection', async (ws: CustomWebSocket, req: IncomingMessage) => {
            try{
                const token = req.headers['authorization']!
                if(!token) return ws.close(4001, "Invalid token provided")

                const user = await jwt.decode({ token })
                if(!user) return ws.close(4001, "Invalid token provided")
                ws.user = user
            }
            catch(e: any){
                return ws.close(4001, "Invalid token provided")
            }

            if(!ws.user) return ws.close(4001, "Invalid token provided")

            // get all users rooms and connect them there

            const userRides = await RideService.getAllRidesForUser(Number(ws.user.id))

            userRides.map(ride => { 
                if(!this.rooms[ride.id]) this.rooms[ride.id] = [ws]
                else this.rooms[ride.id].push(ws)
            })

            ws.on('message', (message: string) => {
                console.log(message.toString())
            })
        })
    }

    broadcastMessage(rideId: string, message: any){
        if(!this.rooms[rideId]) this.rooms[rideId] = []
        
        this.rooms[rideId].forEach(ws => {
            if(ws.readyState === ws.CLOSED){
                // TODO: remove ws from room
            }

            ws.send(JSON.stringify(message))
        })
    }
}