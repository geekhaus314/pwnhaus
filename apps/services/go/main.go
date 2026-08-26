package main

import (
	"encoding/json"
	"log"
	"net/http"
)

type healthResponse struct {
	Service string `json:"service"`
	Status  string `json:"status"`
	Runtime string `json:"runtime"`
}

func health(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(healthResponse{Service: "go", Status: "ok", Runtime: "go"})
}

func main() {
	http.HandleFunc("/health", health)
	log.Println("Go service listening on http://127.0.0.1:4102")
	log.Fatal(http.ListenAndServe("127.0.0.1:4102", nil))
}

