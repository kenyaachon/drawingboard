package main

import (
	"log"
	"net/http"
)

func main() {
	hub := newHub()
	go hub.run()
	
	http.HandleFunc("/ws", hub.handleWebSocket)
	err := http.ListenAndServe(":4000", nil)
	if err != nil {
		log.Fatal(err)
	}
}