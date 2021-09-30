package main

import (
	"math/rand"
	"time"

	"github.com/gorilla/websocket"
	colorful "github.com/lucasb-eyer/go-colorful"
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

func generateColor() string {
	c := colorful.Hsv(rand.Float64()*360.0, 0.8, 0.8)
	return c.Hex()
}

//reads messages from clients and forwards them to the 
//hub
func (client *Client) read() {
	defer func() {
		client.hub.unregister <- client
	}()

	for {
		_, data, err := client.socket.ReadMessage()
		if err != nil {
			break
		}
		client.hub.onMessage(data, client)
	}
}


//Takes message from the outbound channel and sends them
//to the client
func (client *Client) write() {
	for {
		select {
		case data, ok := <- client.outbound:
			if !ok {
				client.socket.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			client.socket.WriteMessage(websocket.TextMessage, data)
		}
	}
} 

//for starting processing of the client
func (client Client) run() {
	go client.read()
	go client.write()
}

//for ending processing of the client
func (client Client) close() {
	client.socket.Close()
	close(client.outbound)
}